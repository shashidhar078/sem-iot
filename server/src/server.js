const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const twilio = require("twilio");
const Product = require("./models/Product");
const Cart = require("./models/Cart");
const Bill = require("./models/Bill");
const User = require("./models/User");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const mongoUri =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/esiot";
const scanCooldownMs = Number(process.env.SCAN_COOLDOWN_MS || 900);
const removeOnRescan =
  String(process.env.REMOVE_ON_RESCAN || "false").toLowerCase() === "true";
const adminSeedPassword = process.env.ADMIN_PASSWORD || "admin123";

const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

const lastScanByUserAndUid = new Map();

app.use(cors());
app.use(express.json());

const defaultProducts = [
  { uid: "FE5783B9", name: "Milk", price: 50, quantity: 100, category: "Dairy" },
  { uid: "96D80904", name: "Bread", price: 35, quantity: 80, category: "Bakery" },
  { uid: "C331FF03", name: "Juice", price: 90, quantity: 60, category: "Beverages" },
  { uid: "7E4F81B9", name: "Chocolate", price: 120, quantity: 40, category: "Snacks" },
  { uid: "D49AA21", name: "Water", price: 60, quantity: 120, category: "Beverages" },
];

const defaultCustomers = [
  {
    name: "Ganesh",
    email: "ganesh@example.com",
    phone: "9876543210",
    password: "ganesh123",
    balance: 500,
  },
  {
    name: "Kavya",
    email: "kavya@example.com",
    phone: "9876543211",
    password: "kavya123",
    balance: 700,
  },
  {
    name: "Rahul",
    email: "rahul@example.com",
    phone: "9876543212",
    password: "rahul123",
    balance: 900,
  },
];

const normalizeUid = (uid) => uid.toUpperCase().trim();
const recalculateCartTotal = (items) =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0);
const makeBillId = () => `BILL-${Date.now().toString().slice(-8)}`;

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  balance: user.balance,
});

const normalizeIndianPhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (String(phone).startsWith("+")) return String(phone);
  return null;
};

const sendWhatsAppBill = async (user, bill) => {
  if (!twilioClient || !process.env.TWILIO_WHATSAPP_FROM) return;
  const toPhone = normalizeIndianPhone(user.phone);
  if (!toPhone) return;
  const itemsText = bill.items.map((item) => `${item.name} x${item.quantity}`).join(", ");
  await twilioClient.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to: `whatsapp:${toPhone}`,
    body: `Bill ${bill.billId}\nTotal: Rs ${bill.total}\nItems: ${itemsText}`,
  });
};

const authRequired = async (req, res, next) => {
  try {
    const userId = req.header("x-user-id");
    if (!userId) return res.status(401).json({ message: "x-user-id header is required" });
    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ message: "Invalid user" });
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized", error: error.message });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }
  return next();
};

const getUserCart = async (userId) =>
  Cart.findOneAndUpdate(
    { userId },
    { $setOnInsert: { items: [], total: 0 } },
    { upsert: true, new: true }
  );

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "ESIOT backend running",
    scanCooldownMs,
    removeOnRescan,
    twilioConfigured: Boolean(twilioClient),
  });
});

app.post("/auth/signup", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body || {};
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "name, email, password and phone are required" });
    }
    const exists = await User.findOne({
      $or: [{ email: String(email).toLowerCase().trim() }, { phone: String(phone).trim() }],
    });
    if (exists) return res.status(409).json({ message: "User already exists with email/phone" });
    const hashedPassword = await bcrypt.hash(String(password), 10);
    const user = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      password: hashedPassword,
      phone: String(phone).trim(),
      role: "customer",
      balance: 0,
    });
    res.status(201).json({ user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Failed to signup", error: error.message });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password, phone } = req.body || {};
    let user;
    if (email) {
      user = await User.findOne({ email: String(email).toLowerCase().trim() });
    } else if (phone) {
      user = await User.findOne({ phone: String(phone).trim() });
    } else {
      return res.status(400).json({ message: "Provide email or phone and password" });
    }
    if (!user) return res.status(404).json({ message: "User not found" });
    const valid = await bcrypt.compare(String(password || ""), user.password);
    if (!valid) return res.status(401).json({ message: "Invalid password" });
    res.status(200).json({ user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
});

app.post("/users", authRequired, adminOnly, async (req, res) => {
  try {
    const { name, email, password, phone, role, balance } = req.body || {};
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "name, email, password and phone are required" });
    }
    if (role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount > 0) {
        return res.status(400).json({ message: "Only one admin is allowed" });
      }
    }
    const hashedPassword = await bcrypt.hash(String(password), 10);
    const user = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      password: hashedPassword,
      phone: String(phone).trim(),
      role: role === "admin" ? "admin" : "customer",
      balance: Number(balance || 0),
    });
    res.status(201).json({ user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Failed to create user", error: error.message });
  }
});

app.put("/users/:id", authRequired, async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    const isSelf = String(req.user._id) === String(req.params.id);
    if (!isAdmin && !isSelf) {
      return res.status(403).json({ message: "Not allowed to update this user" });
    }
    const updates = {};
    if (typeof req.body?.name === "string") updates.name = req.body.name.trim();
    if (typeof req.body?.phone === "string") updates.phone = req.body.phone.trim();
    if (typeof req.body?.email === "string") updates.email = req.body.email.toLowerCase().trim();
    if (req.body?.balance !== undefined) updates.balance = Number(req.body.balance);
    if (isAdmin && req.body?.role) updates.role = req.body.role === "admin" ? "admin" : "customer";
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Failed to update user", error: error.message });
  }
});

app.get("/products", authRequired, async (_req, res) => {
  try {
    const products = await Product.find().sort({ name: 1 });
    const data = products.map((p) => ({
      ...p.toObject(),
      status: p.quantity < 10 ? "LOW STOCK" : "OK",
    }));
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch products", error: error.message });
  }
});

app.post("/products", authRequired, adminOnly, async (req, res) => {
  try {
    const { uid: rawUid, name, price, quantity, category } = req.body || {};
    if (!rawUid || !name || Number.isNaN(Number(price))) {
      return res.status(400).json({ message: "uid, name and valid price are required" });
    }
    const uid = normalizeUid(rawUid);
    const exists = await Product.findOne({ uid });
    if (exists) return res.status(409).json({ message: "Product UID already exists", uid });
    const product = await Product.create({
      uid,
      name: String(name).trim(),
      price: Number(price),
      quantity: Number(quantity ?? 0),
      category: category || "General",
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: "Failed to create product", error: error.message });
  }
});

app.put("/products/:uid", authRequired, adminOnly, async (req, res) => {
  try {
    const uid = normalizeUid(req.params.uid);
    const updates = {};
    if (typeof req.body?.name === "string") updates.name = req.body.name.trim();
    if (req.body?.price !== undefined) updates.price = Number(req.body.price);
    if (req.body?.quantity !== undefined) updates.quantity = Number(req.body.quantity);
    if (typeof req.body?.category === "string") updates.category = req.body.category.trim();
    const product = await Product.findOneAndUpdate({ uid }, updates, { new: true });
    if (!product) return res.status(404).json({ message: "Product not found", uid });
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: "Failed to update product", error: error.message });
  }
});

app.post("/scan", authRequired, async (req, res) => {
  try {
    const rawUid = req.body?.uid;
    if (!rawUid || typeof rawUid !== "string") return res.status(400).json({ message: "uid is required" });
    const uid = normalizeUid(rawUid);
    const key = `${req.user._id}:${uid}`;
    const now = Date.now();
    const previousScan = lastScanByUserAndUid.get(key) || 0;
    if (now - previousScan < scanCooldownMs) {
      return res.status(429).json({ message: "Duplicate scan ignored (cooldown)", uid, cooldownMs: scanCooldownMs });
    }
    lastScanByUserAndUid.set(key, now);

    const product = await Product.findOne({ uid });
    if (!product) return res.status(404).json({ message: "Unknown UID", uid });
    if (product.quantity <= 0) return res.status(400).json({ message: "Out of stock", uid });

    const cart = await getUserCart(req.user._id);
    const existing = cart.items.find((item) => item.uid === uid);
    if (existing) {
      if (removeOnRescan) {
        existing.quantity -= 1;
        if (existing.quantity <= 0) {
          cart.items = cart.items.filter((item) => item.uid !== uid);
          product.quantity += 1;
        } else {
          existing.lineTotal = existing.quantity * existing.price;
          product.quantity += 1;
        }
      } else {
        existing.quantity += 1;
        existing.lineTotal = existing.quantity * existing.price;
        product.quantity -= 1;
      }
    } else {
      cart.items.push({
        uid: product.uid,
        name: product.name,
        price: product.price,
        quantity: 1,
        lineTotal: product.price,
      });
      product.quantity -= 1;
    }

    cart.total = recalculateCartTotal(cart.items);
    await Promise.all([cart.save(), product.save()]);
    res.status(200).json({ cart: { items: cart.items, total: cart.total } });
  } catch (error) {
    res.status(500).json({ message: "Failed to process scan", error: error.message });
  }
});

app.get("/cart", authRequired, async (req, res) => {
  try {
    const cart = await getUserCart(req.user._id);
    res.json({ items: cart.items, total: cart.total });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch cart", error: error.message });
  }
});

app.delete("/cart", authRequired, async (req, res) => {
  try {
    const cart = await getUserCart(req.user._id);
    cart.items = [];
    cart.total = 0;
    await cart.save();
    res.json({ message: "Cart cleared" });
  } catch (error) {
    res.status(500).json({ message: "Failed to clear cart", error: error.message });
  }
});

app.delete("/cart/:uid", authRequired, async (req, res) => {
  try {
    const uid = normalizeUid(req.params.uid);
    const cart = await getUserCart(req.user._id);
    const itemIndex = cart.items.findIndex((item) => item.uid === uid);
    if (itemIndex === -1) return res.status(404).json({ message: "Item not found in cart", uid });
    const removed = cart.items[itemIndex];
    cart.items.splice(itemIndex, 1);
    cart.total = recalculateCartTotal(cart.items);
    await cart.save();
    await Product.updateOne({ uid }, { $inc: { quantity: removed.quantity } });
    res.json({ message: "Item removed from cart", uid, cart: { items: cart.items, total: cart.total } });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove item from cart", error: error.message });
  }
});

app.post("/wallet/add", authRequired, async (req, res) => {
  try {
    const amount = Number(req.body?.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: "Valid amount is required" });
    req.user.balance += amount;
    await req.user.save();
    res.status(200).json({ balance: req.user.balance });
  } catch (error) {
    res.status(500).json({ message: "Failed to add wallet amount", error: error.message });
  }
});

app.get("/wallet", authRequired, async (req, res) => {
  res.status(200).json({ balance: req.user.balance });
});

app.post("/pay", authRequired, async (req, res) => {
  try {
    const cart = await getUserCart(req.user._id);
    if (!cart.items.length) return res.status(400).json({ message: "Cart is empty" });
    if (req.user.balance < cart.total) return res.status(400).json({ message: "Insufficient balance", balance: req.user.balance, total: cart.total });

    req.user.balance -= cart.total;
    await req.user.save();

    const bill = await Bill.create({
      billId: makeBillId(),
      userId: req.user._id,
      customerName: req.user.name,
      customerPhone: req.user.phone,
      items: cart.items,
      total: cart.total,
      paymentStatus: "success",
    });
    cart.items = [];
    cart.total = 0;
    await cart.save();

    try {
      await sendWhatsAppBill(req.user, bill);
    } catch (twilioError) {
      console.error("WhatsApp send failed:", twilioError.message);
    }

    res.status(200).json({
      status: "success",
      billId: bill.billId,
      total: bill.total,
      paidAt: bill.createdAt,
      balance: req.user.balance,
    });
  } catch (error) {
    res.status(500).json({ message: "Payment failed", error: error.message });
  }
});

app.get("/my-bills", authRequired, async (req, res) => {
  try {
    const bills = await Bill.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(bills);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch your bills", error: error.message });
  }
});

app.get("/bill/:id", authRequired, async (req, res) => {
  try {
    const bill = await Bill.findOne({ billId: req.params.id.toUpperCase() });
    if (!bill) return res.status(404).json({ message: "Bill not found" });
    if (req.user.role !== "admin" && String(bill.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not allowed to read this bill" });
    }
    res.status(200).json(bill);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch bill", error: error.message });
  }
});

app.get("/bills", authRequired, adminOnly, async (_req, res) => {
  try {
    const bills = await Bill.find().sort({ createdAt: -1 });
    res.status(200).json(bills);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch bills", error: error.message });
  }
});

const seedUsers = async () => {
  const adminExists = await User.findOne({ role: "admin" });
  if (!adminExists) {
    const adminPassword = await bcrypt.hash(adminSeedPassword, 10);
    await User.create({
      name: "ESIOT Admin",
      email: "admin@esiot.com",
      password: adminPassword,
      phone: "9000000000",
      role: "admin",
      balance: 0,
    });
    console.log("Seeded default admin user: admin@esiot.com");
  }

  for (const customer of defaultCustomers) {
    const exists = await User.findOne({ email: customer.email });
    if (!exists) {
      const password = await bcrypt.hash(customer.password, 10);
      await User.create({
        ...customer,
        password,
        role: "customer",
      });
    }
  }
};

const start = async () => {
  try {
    await mongoose.connect(mongoUri);
    const existingProducts = await Product.countDocuments();
    if (!existingProducts) await Product.insertMany(defaultProducts);
    await seedUsers();
    app.listen(port, () => {
      console.log(`ESIOT backend listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Startup error:", error);
    process.exit(1);
  }
};

start();
