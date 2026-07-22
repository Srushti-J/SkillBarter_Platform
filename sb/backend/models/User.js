/**
 * User Model — v2
 * ================
 * Added:
 *   - profileImage (local path or Cloudinary URL)
 *   - lastSeen     (for "last seen X ago" feature)
 *   - isProfileComplete (virtual — true when name + skillsOffered + skillsWanted all present)
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // never return password in queries by default
    },

    bio: {
      type: String,
      default: '',
      maxlength: 500,
    },

    // Profile picture — can be a local path (/uploads/xxx.jpg) or Cloudinary URL
    profileImage: {
      type: String,
      default: '',
    },

    // Skills this user can TEACH others (must have at least 1 for profile to be complete)
    skillsOffered: {
      type: [String],
      default: [],
    },

    // Skills this user WANTS to learn (must have at least 1 for profile to be complete)
    skillsWanted: {
      type: [String],
      default: [],
    },

    // Aggregated rating from reviews (recalculated on each new review)
    reputationScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    reviewCount: {
      type: Number,
      default: 0,
    },

    // Last time the user was seen online (updated on socket disconnect)
    lastSeen: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    // Add a virtual field so we can check completeness easily
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── VIRTUAL: isProfileComplete ────────────────────────────────────────────────
// A profile is "complete" when it has a name AND at least one skill in each list.
// Used by the matching controller to filter out incomplete profiles.
UserSchema.virtual('isProfileComplete').get(function () {
  return (
    Boolean(this.name) &&
    this.skillsOffered.length > 0 &&
    this.skillsWanted.length  > 0
  );
});

// ── HOOKS ─────────────────────────────────────────────────────────────────────
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt    = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── METHODS ───────────────────────────────────────────────────────────────────
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
