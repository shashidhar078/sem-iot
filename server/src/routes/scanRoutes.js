const express = require("express");
const Product = require("../models/Product");
const { resolveUser, normalizeUid, recalcTotal } = require("../utils");
const { getActiveUserId } = require("../store");
const { getUserCart } = require("./cartRoutes");

const router = express.Router();

// Memory store to prevent RFID bounce (rapid duplicate scans)
const scanCooldowns = new Map();

router.post("/scan", async (req, res) => {
  try {
    const rawUid = req.body.uid;
    console.log("📥 Scan:", rawUid);
    console.log("👤 Active user:", getActiveUserId());
    
    const user = await resolveUser(req);
    if (!user) {
      return res.status(400).json({ message: "No active user" });
    }

    const uid = normalizeUid(rawUid);

    // --- COOLDOWN LOGIC ---
    const cooldownMs = parseInt(process.env.SCAN_COOLDOWN_MS || "900", 10);
    const cooldownKey = `${user._id}_${uid}`;
    const now = Date.now();
    const lastScan = scanCooldowns.get(cooldownKey) || 0;
    
    if (now - lastScan < cooldownMs) {
      console.log(`⏳ Ignored scan (cooldown): ${uid}`);
      return res.status(429).json({ message: "Scan ignored (cooldown)" });
    }
    scanCooldowns.set(cooldownKey, now);
    // ----------------------

    const product = await Product.findOne({ uid });
    if (!product) {
      return res.status(404).json({ message: "Unknown UID" });
    }

    const removeOnRescan = process.env.REMOVE_ON_RESCAN === "true";
    const cart = await getUserCart(user._id);
    const existingIndex = cart.items.findIndex((item) => item.uid === uid);

    if (existingIndex > -1) {
      const existing = cart.items[existingIndex];

      if (removeOnRescan) {
        // Remove 1 quantity
        existing.quantity -= 1;
        product.quantity += 1; // Restore to stock
        
        if (existing.quantity <= 0) {
          cart.items.splice(existingIndex, 1);
        } else {
          existing.lineTotal = existing.quantity * existing.price;
        }
        console.log("🛒 Removed/Decreased:", product.name);
      } else {
        // Add 1 quantity
        if (product.quantity <= 0) {
          return res.status(400).json({ message: "Out of stock" });
        }
        existing.quantity += 1;
        product.quantity -= 1;
        existing.lineTotal = existing.quantity * existing.price;
        console.log("🛒 Added (Increase Qty):", product.name);
      }
      cart.markModified("items");
    } else {
      // Not in cart yet, ADD
      if (product.quantity <= 0) {
        return res.status(400).json({ message: "Out of stock" });
      }
      cart.items.push({
        uid: product.uid,
        name: product.name,
        price: product.price,
        quantity: 1,
        lineTotal: product.price,
      });
      product.quantity -= 1;
      console.log("🛒 Added (New):", product.name);
    }

    cart.total = recalcTotal(cart.items);
    await Promise.all([cart.save(), product.save()]);

    res.json({ cart: cart.items, total: cart.total });
  } catch (err) {
    console.error("❌ Scan error:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
