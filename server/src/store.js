let activeUserId = null;

const getActiveUserId = () => activeUserId;
const setActiveUserId = (id) => {
  activeUserId = id;
};

module.exports = {
  getActiveUserId,
  setActiveUserId,
};
