/**
 * Request Controller — Real-Time
 * ================================
 * FEATURES:
 *  ✅ Send barter request → stored in DB → Socket.io notifies receiver instantly
 *  ✅ Accept/Reject → stored in DB → Socket.io notifies sender instantly
 *  ✅ Profile completeness gate before sending a request
 *  ✅ No duplicate pending requests between same pair
 */

const { SkillRequest } = require('../models/models');
const User = require('../models/User');

// ─── SEND REQUEST ─────────────────────────────────────────────────────────────
/**
 * POST /api/requests
 * User A sends a barter request to User B.
 */
const sendRequest = async (req, res) => {
  try {
    const { receiverId, skillOffered, skillRequested, message } = req.body;
    const senderId = req.user._id;

    // ── Validation ────────────────────────────────────────────────────────────
    if (!receiverId || !skillOffered || !skillRequested) {
      return res.status(400).json({
        message: 'receiverId, skillOffered, and skillRequested are required',
      });
    }

    // Can't send request to yourself
    if (receiverId === senderId.toString()) {
      return res.status(400).json({ message: "You can't send a request to yourself" });
    }

    // Sender must have a complete profile
    const sender = await User.findById(senderId);
    if (
      !sender.name ||
      sender.skillsOffered.length === 0 ||
      sender.skillsWanted.length  === 0
    ) {
      return res.status(400).json({
        message: 'Complete your profile (add skills) before sending requests',
      });
    }

    // Receiver must exist
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    // No duplicate pending request between the same pair
    const existing = await SkillRequest.findOne({
      senderId,
      receiverId,
      requestStatus: 'pending',
    });
    if (existing) {
      return res.status(400).json({
        message: 'You already have a pending request with this user',
      });
    }

    // ── Create request ────────────────────────────────────────────────────────
    const newRequest = await SkillRequest.create({
      senderId,
      receiverId,
      skillOffered,
      skillRequested,
      message: message || '',
    });

    // Populate for the response
    const populated = await SkillRequest.findById(newRequest._id)
      .populate('senderId',   'name profileImage skillsOffered skillsWanted reputationScore')
      .populate('receiverId', 'name profileImage');

    // ── Real-time notification to receiver ────────────────────────────────────
    // io is attached to req.app in server.js
    const io = req.app.get('io');
    io.to(receiverId).emit('new_request', populated);

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── UPDATE STATUS ────────────────────────────────────────────────────────────
/**
 * PUT /api/requests/:id/status
 * Only the RECEIVER can accept or reject.
 * Emits real-time notification to the SENDER.
 */
const updateRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be "accepted" or "rejected"' });
    }

    const request = await SkillRequest.findById(req.params.id)
      .populate('senderId',   'name profileImage')
      .populate('receiverId', 'name profileImage');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Only the receiver can change the status
    if (request.receiverId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the receiver can update the request' });
    }

    request.requestStatus = status;
    await request.save();

    // ── Real-time notification to the SENDER ──────────────────────────────────
    const io = req.app.get('io');
    const senderId = request.senderId._id.toString();
    io.to(senderId).emit('request_status_changed', request);

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET MY REQUESTS ──────────────────────────────────────────────────────────
/**
 * GET /api/requests
 * Returns all sent and received requests for the logged-in user.
 */
const getMyRequests = async (req, res) => {
  try {
    const [sent, received] = await Promise.all([
      SkillRequest.find({ senderId: req.user._id })
        .populate('receiverId', 'name profileImage skillsOffered skillsWanted reputationScore')
        .sort({ createdAt: -1 }),

      SkillRequest.find({ receiverId: req.user._id })
        .populate('senderId', 'name profileImage skillsOffered skillsWanted reputationScore')
        .sort({ createdAt: -1 }),
    ]);

    res.json({ sent, received });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { sendRequest, updateRequestStatus, getMyRequests };
