/**
 * Profile Controller
 * ===================
 * GET profile, UPDATE profile, UPLOAD profile image.
 * 
 * Profile completeness check:
 *   name + skillsOffered (≥1) + skillsWanted (≥1)
 */

const User = require('../models/User');
const path = require('path');
const fs   = require('fs');

// ─── GET PROFILE ──────────────────────────────────────────────────────────────
/**
 * GET /api/profile/:id
 * Returns a user's public profile — no password, no email.
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -email');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── UPDATE PROFILE ───────────────────────────────────────────────────────────
/**
 * PUT /api/profile
 * Update name, bio, skills.
 */
const updateProfile = async (req, res) => {
  try {
    const { name, bio, skillsOffered, skillsWanted } = req.body;

    // Build update object with only provided fields
    const updates = {};
    if (name !== undefined)          updates.name          = name.trim();
    if (bio  !== undefined)          updates.bio           = bio.trim();
    if (skillsOffered !== undefined) updates.skillsOffered = skillsOffered;
    if (skillsWanted  !== undefined) updates.skillsWanted  = skillsWanted;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'Profile updated successfully', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── UPLOAD PROFILE IMAGE ─────────────────────────────────────────────────────
/**
 * POST /api/profile/upload-image
 * Multer puts the file in /uploads/, we store the path in the DB.
 */
const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Build the URL path clients will use to load the image
    const imageUrl = `/uploads/${req.file.filename}`;

    // Delete the old image from disk if it was a local upload
    const currentUser = await User.findById(req.user._id);
    if (currentUser.profileImage && currentUser.profileImage.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '..', currentUser.profileImage);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Save new image path to user document
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profileImage: imageUrl },
      { new: true }
    ).select('-password');

    res.json({ message: 'Image uploaded successfully', imageUrl, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET PROFILE COMPLETENESS ─────────────────────────────────────────────────
/**
 * GET /api/profile/completeness
 * Returns whether the profile is complete and which fields are missing.
 */
const getCompleteness = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    const missing = [];
    if (!user.name)                   missing.push('name');
    if (user.skillsOffered.length < 1) missing.push('at least one skill you can teach');
    if (user.skillsWanted.length  < 1) missing.push('at least one skill you want to learn');

    res.json({
      isComplete: missing.length === 0,
      missing,
      user,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getProfile, updateProfile, uploadProfileImage, getCompleteness };
