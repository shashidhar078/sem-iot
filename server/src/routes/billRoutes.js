const express = require("express");
const Bill = require("../models/Bill");
const { resolveUser } = require("../utils");

const router = express.Router();

router.get("/my-bills", async (req, res) => {
  try {
    const user = await resolveUser(req);
    if (!user) return res.status(400).json({ message: "No active user" });

    const bills = await Bill.find({ userId: user._id });
    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch bills" });
  }
});

router.get("/bills", async (req, res) => {
  try {
    const bills = await Bill.find();
    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch all bills" });
  }
});

module.exports = router;
