const express = require("express");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { resolveUser, recalcTotal } = require("../utils");

const router = express.Router();

const getUserCart = async (userId) =>
  Cart.findOneAndUpdate(
    { userId },
    { $setOnInsert: { items: [], total: 0 } },
    { upsert: true, new: true },
  );

router.get("/", async (req, res) => {
  try {
    const user = await resolveUser(req);
    if (!user) return res.status(400).json({ message: "No active user" });

    const cart = await getUserCart(user._id);
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch cart" });
  }
});

router.delete("/:uid", async (req, res) => {
  try {
    const user = await resolveUser(req);
    if (!user) return res.status(400).json({ message: "No active user" });

    const { uid } = req.params;
    const cart = await getUserCart(user._id);
    const existingIndex = cart.items.findIndex(
      (item) => item.uid === uid.toUpperCase().trim()
    );

    if (existingIndex > -1) {
      const item = cart.items[existingIndex];
      const product = await Product.findOne({ uid: item.uid });
      if (product) {
        product.quantity += item.quantity;
        await product.save();
      }
      cart.items.splice(existingIndex, 1);
      cart.total = recalcTotal(cart.items);
      cart.markModified("items");
      await cart.save();
    }
    
    res.json({ cart });
  } catch (err) {
    res.status(500).json({ message: "Failed to remove item" });
  }
});

router.delete("/", async (req, res) => {
  try {
    const user = await resolveUser(req);
    if (!user) return res.status(400).json({ message: "No active user" });

    const cart = await getUserCart(user._id);
    for (const item of cart.items) {
      const product = await Product.findOne({ uid: item.uid });
      if (product) {
        product.quantity += item.quantity;
        await product.save();
      }
    }
    
    cart.items = [];
    cart.total = 0;
    cart.markModified("items");
    await cart.save();
    
    res.json({ message: "Cart cleared" });
  } catch (err) {
    res.status(500).json({ message: "Failed to clear cart" });
  }
});

module.exports = {
  router,
  getUserCart,
};
