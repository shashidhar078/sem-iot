const mongoose = require("mongoose");

const billItemSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
  },
  { _id: false }
);

const billSchema = new mongoose.Schema(
  {
    billId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    items: { type: [billItemSchema], required: true },
    total: { type: Number, required: true },
    paymentStatus: { type: String, default: "success" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bill", billSchema);
