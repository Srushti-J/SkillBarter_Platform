/**
 * Application Models
 * ==================
 * SkillRequest, Message, Session, Review
 */

const mongoose = require('mongoose');

// ─── SKILL REQUEST ────────────────────────────────────────────────────────────
/**
 * Represents a barter proposal from User A to User B.
 * A says: "I'll teach you X if you teach me Y"
 */
const SkillRequestSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // What the SENDER will teach
    skillOffered: {
      type: String,
      required: [true, 'skillOffered is required'],
      trim: true,
    },
    // What the SENDER wants to learn from receiver
    skillRequested: {
      type: String,
      required: [true, 'skillRequested is required'],
      trim: true,
    },
    requestStatus: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    // Optional note from sender
    message: {
      type: String,
      default: '',
      maxlength: 300,
    },
  },
  { timestamps: true }
);

const SkillRequest = mongoose.model('SkillRequest', SkillRequestSchema);

// ─── MESSAGE ──────────────────────────────────────────────────────────────────
/**
 * Individual chat message between two users.
 * Chat is only allowed once the SkillRequest is accepted.
 */
const MessageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    // true once the receiver has seen it
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for fast conversation queries
MessageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });

const Message = mongoose.model('Message', MessageSchema);

// ─── SESSION ──────────────────────────────────────────────────────────────────
const SessionSchema = new mongoose.Schema(
  {
    user1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    user2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    skillName: { type: String, required: true },
    sessionDate: { type: Date, required: true },
    duration: { type: Number, default: 60 }, // minutes
    sessionStatus: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

const Session = mongoose.model('Session', SessionSchema);

// ─── REVIEW ───────────────────────────────────────────────────────────────────
const ReviewSchema = new mongoose.Schema(
  {
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating:    { type: Number, required: true, min: 1, max: 5 },
    comment:   { type: String, default: '' },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
  },
  { timestamps: true }
);

const Review = mongoose.model('Review', ReviewSchema);

module.exports = { SkillRequest, Message, Session, Review };
