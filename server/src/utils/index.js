const User = require("../models/User");
const { getActiveUserId } = require("../store");

const normalizeUid = (uid) => uid.toUpperCase().trim();

const recalcTotal = (items) =>
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

const resolveUser = async (req) => {
  const headerUserId = req.header("x-user-id");

  if (headerUserId) {
    return await User.findById(headerUserId);
  }

  const activeUserId = getActiveUserId();
  if (activeUserId) {
    return await User.findById(activeUserId);
  }

  return null;
};

module.exports = {
  normalizeUid,
  recalcTotal,
  makeBillId,
  sanitizeUser,
  resolveUser,
};
