const express = require("express");
const Product = require("../models/Product");
const { normalizeUid } = require("../utils");

const router = express.Router();

router.get("/", async (req, res) => {
  const products = await Product.find();

  res.json(
    products.map((p) => ({
      ...p.toObject(),
      status: p.quantity < 10 ? "LOW STOCK" : "OK",
    })),
  );
});

router.put("/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const { price, quantity } = req.body;

    const product = await Product.findOneAndUpdate(
      { uid: normalizeUid(uid) },
      { price, quantity },
      { new: true }
    );

    if (!product) return res.status(404).json({ message: "Product not found" });

    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Failed to update product" });
  }
});

module.exports = router;
