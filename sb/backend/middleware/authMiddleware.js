/**
 * Auth Middleware
 * ===============
 * Verifies the JWT token sent in the Authorization header.
 * Attaches the full user object to req.user.
 */

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'secret_key'
      );

      // Attach user to request (select password explicitly excluded)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      next();
    } catch (error) {
      console.error('JWT error:', error.message);
      return res.status(401).json({ message: 'Not authorized — invalid token' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized — no token' });
  }
};

module.exports = { protect };
