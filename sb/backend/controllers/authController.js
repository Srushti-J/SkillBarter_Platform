/**
 * Auth Controller
 * ================
 * Register and login.  Login now returns the full user profile
 * (including skills) so the frontend has everything it needs
 * right after login without an extra /me request.
 */

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '7d' });

// ─── REGISTER ─────────────────────────────────────────────────────────────────
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password });

    res.status(201).json({
      _id:            user._id,
      name:           user.name,
      email:          user.email,
      bio:            user.bio,
      profileImage:   user.profileImage,
      skillsOffered:  user.skillsOffered,
      skillsWanted:   user.skillsWanted,
      reputationScore:user.reputationScore,
      reviewCount:    user.reviewCount,
      token:          generateToken(user._id),
    });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// ─── LOGIN ─────────────────────────────────────────────────────────────────────
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Must explicitly select password since it has select:false in schema
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id:            user._id,
      name:           user.name,
      email:          user.email,
      bio:            user.bio,
      profileImage:   user.profileImage,
      skillsOffered:  user.skillsOffered,
      skillsWanted:   user.skillsWanted,
      reputationScore:user.reputationScore,
      reviewCount:    user.reviewCount,
      token:          generateToken(user._id),
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// ─── GET ME ────────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  // req.user is the full user object set by the protect middleware
  res.json(req.user);
};

module.exports = { registerUser, loginUser, getMe };
