const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const { getActiveUserId } = require("./store");

// Routes
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const { router: cartRoutes } = require("./routes/cartRoutes");
const walletRoutes = require("./routes/walletRoutes");
const billRoutes = require("./routes/billRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const scanRoutes = require("./routes/scanRoutes");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 🔥 Request logger
app.use((req, res, next) => {
  const silentPaths = ['/cart', '/my-bills', '/wallet', '/health'];
  if (!silentPaths.includes(req.url) && req.method !== 'OPTIONS') {
    console.log(`📡 ${req.method} ${req.url}`);
  }
  next();
});

const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/esiot";

// =======================
// HEALTH
// =======================
app.get("/health", (req, res) => {
  res.json({ ok: true, activeUserId: getActiveUserId() });
});

// =======================
// MOUNT ROUTES
// =======================
app.use("/auth", authRoutes);
app.use("/set-active-user", (req, res, next) => {
  // Aliased to authRoutes for backwards compatibility in frontend route paths
  // Wait, frontend calls POST /set-active-user directly, not /auth/set-active-user!
  // So we'll mount auth routes on / as well for set-active-user, or just mount authRoutes at / for this specific endpoint.
  // Actually, we can just let authRoutes handle it by mounting it on root or forwarding.
  req.url = "/set-active-user";
  authRoutes(req, res, next);
});

app.use("/products", productRoutes);
app.use("/cart", cartRoutes);
app.use("/wallet", walletRoutes);
app.use("/", billRoutes); // /bills, /my-bills
app.use("/", paymentRoutes); // /pay
app.use("/", scanRoutes); // /scan

// =======================
// ADMIN SEED
// =======================
const seedAdmin = async () => {
  try {
    const adminEmail = "admin@esiot.com";
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      console.log("⚠️ No admin found. Creating default admin...");
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await User.create({
        name: "Admin",
        email: adminEmail,
        password: hashedPassword,
        phone: "9999999999",
        role: "admin",
        balance: 0,
      });
      console.log("✅ Default admin created");
      console.log("📧 Email: admin@esiot.com");
      console.log("🔑 Password: admin123");
    } else {
      console.log("✅ Admin already exists");
    }
  } catch (err) {
    console.error("❌ Admin seed error:", err);
  }
};

// =======================
// START SERVER
// =======================
const start = async () => {
  try {
    console.log("🔌 Connecting to MongoDB...");
    console.log("📍 DB URI:", mongoUri);

    await mongoose.connect(mongoUri);
    await seedAdmin();

    console.log("✅ MongoDB Connected");

    app.listen(port, "0.0.0.0", () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("❌ DB error:", err.message);
    process.exit(1);
  }
};

start();
