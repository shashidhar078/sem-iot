const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Product = require("./models/Product");
const Cart = require("./models/Cart");
const Bill = require("./models/Bill");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/esiot";
const scanCooldownMs = Number(process.env.SCAN_COOLDOWN_MS || 900);
const removeOnRescan =
  String(process.env.REMOVE_ON_RESCAN || "false").toLowerCase() === "true";
const lastScanByUid = new Map();

app.use(cors());
app.use(express.json());

const defaultProducts = [
  { uid: "FE5783B9", name: "Milk", price: 50, category: "Dairy" },
  { uid: "96D80904", name: "Bread", price: 35, category: "Bakery" },
  { uid: "C331FF03", name: "Juice", price: 90, category: "Beverages" },
  { uid: "7E4F81B9", name: "Chocolate", price: 120, category: "Snacks" },
  { uid: "D49AA21", name: "Water", price: 60, category: "Beverages" },
];

const getActiveCart = async () => {
  const cart = await Cart.findOneAndUpdate(
    { key: "active-cart" },
    { $setOnInsert: { items: [], total: 0 } },
    { upsert: true, new: true },
  );
  return cart;
};

const recalculateCartTotal = (items) =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0);

const makeBillId = () => `BILL-${Date.now().toString().slice(-8)}`;
const normalizeUid = (uid) => uid.toUpperCase().trim();

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "ESIOT backend running",
    scanCooldownMs,
    removeOnRescan,
  });
});

app.get("/products", async (_req, res) => {
  try {
    const products = await Product.find().sort({ name: 1 });
    res.status(200).json(products);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch products", error: error.message });
  }
});

app.post("/products", async (req, res) => {
  try {
    const { uid: rawUid, name, price, category } = req.body || {};
    if (!rawUid || !name || Number.isNaN(Number(price))) {
      return res
        .status(400)
        .json({ message: "uid, name and valid price are required" });
    }

    const uid = normalizeUid(rawUid);
    const exists = await Product.findOne({ uid });
    if (exists) {
      return res
        .status(409)
        .json({ message: "Product UID already exists", uid });
    }

    const product = await Product.create({
      uid,
      name: String(name).trim(),
      price: Number(price),
      category: category || "General",
    });
    res.status(201).json(product);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to create product", error: error.message });
  }
});

app.put("/products/:uid", async (req, res) => {
  try {
    const uid = normalizeUid(req.params.uid);
    const updates = {};
    if (typeof req.body?.name === "string") updates.name = req.body.name.trim();
    if (req.body?.price !== undefined) updates.price = Number(req.body.price);
    if (typeof req.body?.category === "string")
      updates.category = req.body.category.trim();

    const product = await Product.findOneAndUpdate({ uid }, updates, {
      new: true,
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found", uid });
    }
    res.status(200).json(product);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update product", error: error.message });
  }
});

app.delete("/products/:uid", async (req, res) => {
  try {
    const uid = normalizeUid(req.params.uid);
    const product = await Product.findOneAndDelete({ uid });
    if (!product) {
      return res.status(404).json({ message: "Product not found", uid });
    }
    res.status(200).json({ message: "Product removed", uid });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to remove product", error: error.message });
  }
});

app.post("/scan", async (req, res) => {
  try {
    const rawUid = req.body?.uid;
    if (!rawUid || typeof rawUid !== "string") {
      return res.status(400).json({ message: "uid is required" });
    }

    const uid = normalizeUid(rawUid);
    const now = Date.now();
    const previousScan = lastScanByUid.get(uid) || 0;
    if (now - previousScan < scanCooldownMs) {
      return res.status(429).json({
        message: "Duplicate scan ignored (cooldown)",
        uid,
        cooldownMs: scanCooldownMs,
      });
    }
    lastScanByUid.set(uid, now);

    const product = await Product.findOne({ uid });
    if (!product) {
      return res.status(404).json({
        message: "Unknown RFID tag. Map this UID in products table.",
        uid,
      });
    }

    const cart = await getActiveCart();
    const existing = cart.items.find((item) => item.uid === uid);

    if (existing) {
      if (removeOnRescan) {
        existing.quantity -= 1;
        if (existing.quantity <= 0) {
          cart.items = cart.items.filter((item) => item.uid !== uid);
        } else {
          existing.lineTotal = existing.quantity * existing.price;
        }
      } else {
        existing.quantity += 1;
        existing.lineTotal = existing.quantity * existing.price;
      }
    } else {
      cart.items.push({
        uid: product.uid,
        name: product.name,
        price: product.price,
        quantity: 1,
        lineTotal: product.price,
      });
    }

    cart.total = recalculateCartTotal(cart.items);
    await cart.save();

    const cartItem = cart.items.find((item) => item.uid === uid);

    res.status(200).json({
      product: {
        uid: product.uid,
        name: product.name,
        price: product.price,
        quantity: cartItem?.quantity || 0,
      },
      mode: removeOnRescan ? "remove_on_rescan" : "increment_on_rescan",
      cart: {
        items: cart.items,
        total: cart.total,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to process scan", error: error.message });
  }
});

app.get("/cart", async (_req, res) => {
  try {
    const cart = await getActiveCart();
    res.json({ items: cart.items, total: cart.total });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch cart", error: error.message });
  }
});

app.delete("/cart", async (_req, res) => {
  try {
    const cart = await getActiveCart();
    cart.items = [];
    cart.total = 0;
    await cart.save();
    res.json({ message: "Cart cleared" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to clear cart", error: error.message });
  }
});

app.delete("/cart/:uid", async (req, res) => {
  try {
    const uid = normalizeUid(req.params.uid);
    const cart = await getActiveCart();
    const itemIndex = cart.items.findIndex((item) => item.uid === uid);
    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart", uid });
    }
    cart.items.splice(itemIndex, 1);
    cart.total = recalculateCartTotal(cart.items);
    await cart.save();
    res.json({
      message: "Item removed from cart",
      uid,
      cart: { items: cart.items, total: cart.total },
    });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Failed to remove item from cart",
        error: error.message,
      });
  }
});

app.post("/pay", async (_req, res) => {
  try {
    const cart = await getActiveCart();
    if (!cart.items.length) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const bill = await Bill.create({
      billId: makeBillId(),
      items: cart.items,
      total: cart.total,
      paymentStatus: "success",
    });

    cart.items = [];
    cart.total = 0;
    await cart.save();

    res.status(200).json({
      status: "success",
      billId: bill.billId,
      total: bill.total,
      paidAt: bill.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: "Payment failed", error: error.message });
  }
});

app.get("/bill/:id", async (req, res) => {
  try {
    const bill = await Bill.findOne({ billId: req.params.id.toUpperCase() });
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }
    res.status(200).json(bill);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch bill", error: error.message });
  }
});

app.get("/bills", async (_req, res) => {
  try {
    const bills = await Bill.find().sort({ createdAt: -1 });
    res.status(200).json(bills);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch bills", error: error.message });
  }
});

const start = async () => {
  try {
    await mongoose.connect(mongoUri);
    const existingProducts = await Product.countDocuments();
    if (!existingProducts) {
      await Product.insertMany(defaultProducts);
    }
    await getActiveCart();
    app.listen(port, () => {
      console.log(`ESIOT backend listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Startup error:", error);
    process.exit(1);
  }
};

start();
