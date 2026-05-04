const express = require("express");
const { resolveUser } = require("../utils");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const user = await resolveUser(req);
    if (!user) return res.status(400).json({ message: "No active user" });

    res.json({ balance: user.balance || 0 });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch wallet balance" });
  }
});

router.post("/add", async (req, res) => {
  try {
    const user = await resolveUser(req);
    if (!user) return res.status(400).json({ message: "No active user" });

    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: "Invalid amount" });

    user.balance += amount;
    await user.save();

    res.json({ balance: user.balance });
  } catch (err) {
    res.status(500).json({ message: "Failed to add money to wallet" });
  }
});

module.exports = router;
