const express = require("express");
const twilio = require("twilio");
const Bill = require("../models/Bill");
const { resolveUser, makeBillId } = require("../utils");
const { getUserCart } = require("./cartRoutes");

const router = express.Router();

router.post("/pay", async (req, res) => {
  try {
    const user = await resolveUser(req);
    if (!user) return res.status(400).json({ message: "No active user" });

    const cart = await getUserCart(user._id);

    console.log("💳 Payment:", user._id, cart.total);

    if (user.balance < cart.total) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    user.balance -= cart.total;
    await user.save();

    const bill = await Bill.create({
      billId: makeBillId(),
      userId: user._id,
      customerName: user.name,
      customerPhone: user.phone,
      items: cart.items,
      total: cart.total,
    });

    cart.items = [];
    cart.total = 0;
    cart.markModified("items");
    await cart.save();

    console.log("✅ Payment success:", bill.billId);

    // ===================================
    // TWILIO WHATSAPP INTEGRATION
    // ===================================
    try {
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM) {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID.trim(), process.env.TWILIO_AUTH_TOKEN.trim());
        
        let messageBody = `*ESIOT SMART BILLING*\nReceipt: ${bill.billId}\n\n*Items:*\n`;
        bill.items.forEach((item, idx) => {
          messageBody += `${idx + 1}. ${item.name} (x${item.quantity}) - Rs ${item.lineTotal}\n`;
        });
        messageBody += `\n*Total Paid: Rs ${bill.total}*\n\nThank you for shopping!`;

        let formattedPhone = user.phone;
        if (formattedPhone.length === 10 && !formattedPhone.startsWith('+')) {
          formattedPhone = `+91${formattedPhone}`;
        }

        const sender = process.env.TWILIO_WHATSAPP_FROM.trim();
        const fromNumber = sender.startsWith("whatsapp:") ? sender : `whatsapp:${sender}`;

        await client.messages.create({
          body: messageBody,
          from: fromNumber,
          to: `whatsapp:${formattedPhone}`
        });
        console.log("📲 WhatsApp receipt sent to:", formattedPhone);
      } else {
        console.log("⚠️ Twilio credentials missing in .env, WhatsApp receipt skipped.");
      }
    } catch (twErr) {
      console.error("\n❌ WhatsApp send failed:");
      console.error("   Message:", twErr.message);
      console.error("   Code:", twErr.code || "N/A");
      console.error("   Status:", twErr.status || "N/A");
      console.error("   More Info:", twErr.moreInfo || "N/A");
      
      const sid = process.env.TWILIO_ACCOUNT_SID ? process.env.TWILIO_ACCOUNT_SID.trim() : "MISSING";
      const token = process.env.TWILIO_AUTH_TOKEN ? process.env.TWILIO_AUTH_TOKEN.trim() : "MISSING";
      const maskedSid = sid !== "MISSING" ? `${sid.substring(0, 4)}...${sid.slice(-4)}` : sid;
      const maskedToken = token !== "MISSING" ? `${token.substring(0, 4)}...${token.slice(-4)}` : token;
      
      console.error(`   Using SID: ${maskedSid}`);
      console.error(`   Using Auth Token: ${maskedToken}`);
      console.error("   Please check https://console.twilio.com to verify your credentials are correct.\n");
    }

    res.json({ message: "Payment successful", billId: bill.billId, balance: user.balance });
  } catch (err) {
    console.error("❌ Payment error:", err);
    res.status(500).json({ message: "Payment failed" });
  }
});

module.exports = router;
