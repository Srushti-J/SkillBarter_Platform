/**
 * User Controller
 * ================
 * Provides online/offline status for users.
 */

const User = require('../models/User');

/**
 * GET /api/users/online
 * Returns the list of currently online user IDs.
 */
const getOnlineUsers = (req, res) => {
  const onlineUsers = req.app.get('onlineUsers') || {};
  res.json({ onlineUsers: Object.keys(onlineUsers) });
};

/**
 * GET /api/users/:id/status
 * Returns whether a specific user is online, and their last seen time.
 */
const getUserStatus = async (req, res) => {
  try {
    const onlineUsers = req.app.get('onlineUsers') || {};
    const isOnline    = Boolean(onlineUsers[req.params.id]);
    const user        = await User.findById(req.params.id).select('lastSeen name');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      userId:   req.params.id,
      isOnline,
      lastSeen: isOnline ? null : user.lastSeen,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getOnlineUsers, getUserStatus };
