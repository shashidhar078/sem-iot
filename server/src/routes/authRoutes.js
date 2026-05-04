const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { sanitizeUser } = require("../utils");
const { setActiveUserId } = require("../store");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("🔐 Login:", email);

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid password" });

    if (user.role !== "admin") {
      setActiveUserId(user._id);
      console.log("👤 Logged in user set as active:", user._id);
    } else {
      console.log("🛡️ Admin logged in, activeUserId untouched");
    }

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Login failed" });
  }
});

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: "customer",
      balance: 0,
    });

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("❌ Signup error:", err);
    res.status(500).json({ message: "Signup failed" });
  }
});

router.post("/set-active-user", async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);

    if (user && user.role !== "admin") {
      console.log("👤 Active user set:", userId);
      setActiveUserId(userId);
    } else {
      console.log("🛡️ Admin ignored for active user");
    }

    res.json({ message: "Active user updated" });
  } catch (err) {
    console.error("❌ Active user error:", err);
    res.status(500).json({ message: "Error" });
  }
});

module.exports = router;
