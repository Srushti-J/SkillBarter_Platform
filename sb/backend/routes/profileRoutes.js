const express = require('express');
const router  = express.Router();
const {
  getProfile, updateProfile, uploadProfileImage, getCompleteness,
} = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// GET  /api/profile/completeness  — check if own profile is complete
router.get('/completeness', protect, getCompleteness);

// GET  /api/profile/:id           — get any user's public profile
router.get('/:id', protect, getProfile);

// PUT  /api/profile               — update own profile fields
router.put('/', protect, updateProfile);

// POST /api/profile/upload-image  — upload profile photo
router.post('/upload-image', protect, upload.single('profileImage'), uploadProfileImage);

module.exports = router;
