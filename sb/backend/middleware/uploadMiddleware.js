/**
 * Upload Middleware — Multer
 * ==========================
 * Handles profile image uploads.
 * Saves files locally to /uploads/ folder.
 * 
 * To switch to Cloudinary instead:
 * 1. npm install cloudinary multer-storage-cloudinary
 * 2. Replace diskStorage below with CloudinaryStorage
 */

const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// Make sure uploads folder exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Disk storage: save to /uploads/ with a timestamp-based filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // e.g.  profile-64abc123-1710000000000.jpg
    const ext      = path.extname(file.originalname).toLowerCase();
    const userId   = req.user?._id?.toString() || 'unknown';
    const filename = `profile-${userId}-${Date.now()}${ext}`;
    cb(null, filename);
  },
});

// Only allow image files
const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext     = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpg, png, gif, webp)'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

module.exports = upload;
