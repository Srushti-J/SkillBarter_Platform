/**
 * Chat Controller — Accepted Partners Only
 * ==========================================
 * RULES:
 *  ✅ Chat only allowed if there's an accepted SkillRequest between the two users
 *  ✅ Messages stored in MongoDB
 *  ✅ Real-time delivery via Socket.io (done in routes/server)
 *  ✅ Unread count tracked per conversation
 */

const { Message, SkillRequest } = require('../models/models');
const mongoose = require('mongoose');

// ─── SEND MESSAGE ─────────────────────────────────────────────────────────────
/**
 * POST /api/chat
 * Sends a message.  Checks that an accepted request exists between sender and receiver.
 */
const sendMessage = async (req, res) => {
  try {
    const { receiverId, message } = req.body;

    if (!receiverId || !message?.trim()) {
      return res.status(400).json({ message: 'receiverId and message are required' });
    }

    // ── Guard: only accepted barter partners can chat ─────────────────────────
    const acceptedRequest = await SkillRequest.findOne({
      requestStatus: 'accepted',
      $or: [
        { senderId: req.user._id, receiverId },
        { senderId: receiverId,   receiverId: req.user._id },
      ],
    });

    if (!acceptedRequest) {
      return res.status(403).json({
        message: 'You can only chat with users who have accepted your barter request',
      });
    }

    // ── Save to DB ────────────────────────────────────────────────────────────
    const msg = await Message.create({
      senderId:   req.user._id,
      receiverId,
      message:    message.trim(),
    });

    // ── Real-time: emit to receiver's userId room ─────────────────────────────
    const io = req.app.get('io');
    io.to(receiverId).emit('receive_message', msg);

    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET MESSAGES ─────────────────────────────────────────────────────────────
/**
 * GET /api/chat/:userId
 * Fetches the full conversation history between the logged-in user and :userId.
 * Also marks all received messages as read.
 */
const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;

    // Guard: only accepted partners
    const acceptedRequest = await SkillRequest.findOne({
      requestStatus: 'accepted',
      $or: [
        { senderId: req.user._id, receiverId: userId },
        { senderId: userId,        receiverId: req.user._id },
      ],
    });

    if (!acceptedRequest) {
      return res.status(403).json({
        message: 'No accepted barter request with this user',
      });
    }

    // Fetch messages between the two users, oldest first
    const messages = await Message.find({
      $or: [
        { senderId: req.user._id, receiverId: userId },
        { senderId: userId,        receiverId: req.user._id },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(200); // cap at 200 messages per load

    // Mark incoming messages as read
    await Message.updateMany(
      { senderId: userId, receiverId: req.user._id, read: false },
      { $set: { read: true } }
    );

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET CONVERSATIONS LIST ───────────────────────────────────────────────────
/**
 * GET /api/chat/conversations
 * Returns a list of all accepted chat partners with the latest message and unread count.
 * Used to populate the chat sidebar.
 */
const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all accepted requests involving this user
    const acceptedRequests = await SkillRequest.find({
      requestStatus: 'accepted',
      $or: [{ senderId: userId }, { receiverId: userId }],
    })
      .populate('senderId',   'name profileImage skillsOffered')
      .populate('receiverId', 'name profileImage skillsOffered');

    // For each accepted request, get the latest message and unread count
    const conversations = await Promise.all(
      acceptedRequests.map(async (req) => {
        const partner =
          req.senderId._id.toString() === userId.toString()
            ? req.receiverId
            : req.senderId;

        const partnerId = partner._id;

        const [lastMessage, unreadCount] = await Promise.all([
          Message.findOne({
            $or: [
              { senderId: userId,    receiverId: partnerId },
              { senderId: partnerId, receiverId: userId },
            ],
          }).sort({ createdAt: -1 }),

          Message.countDocuments({
            senderId:   partnerId,
            receiverId: userId,
            read:       false,
          }),
        ]);

        return {
          partner:       { _id: partner._id, name: partner.name, profileImage: partner.profileImage, skillsOffered: partner.skillsOffered },
          lastMessage:   lastMessage?.message || '',
          lastMessageAt: lastMessage?.createdAt || req.updatedAt,
          unreadCount,
          requestId:     req._id,
        };
      })
    );

    // Sort by most recent message
    conversations.sort(
      (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
    );

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { sendMessage, getMessages, getConversations };
