/**
 * Skill Controller
 */
const User = require('../models/User');

const addSkillOffered = async (req, res) => {
  try {
    const { skill } = req.body;
    if (!skill?.trim()) return res.status(400).json({ message: 'Skill is required' });

    const user = await User.findById(req.user._id);
    const clean = skill.trim();

    if (user.skillsOffered.includes(clean))
      return res.status(400).json({ message: 'Skill already in your offered list' });

    user.skillsOffered.push(clean);
    await user.save();
    res.json({ message: 'Skill added', skillsOffered: user.skillsOffered });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const removeSkillOffered = async (req, res) => {
  try {
    const { skill } = req.body;
    await User.findByIdAndUpdate(req.user._id, { $pull: { skillsOffered: skill } });
    res.json({ message: 'Skill removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const addSkillWanted = async (req, res) => {
  try {
    const { skill } = req.body;
    if (!skill?.trim()) return res.status(400).json({ message: 'Skill is required' });

    const user  = await User.findById(req.user._id);
    const clean = skill.trim();

    if (user.skillsWanted.includes(clean))
      return res.status(400).json({ message: 'Skill already in your wanted list' });

    user.skillsWanted.push(clean);
    await user.save();
    res.json({ message: 'Skill added', skillsWanted: user.skillsWanted });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const removeSkillWanted = async (req, res) => {
  try {
    const { skill } = req.body;
    await User.findByIdAndUpdate(req.user._id, { $pull: { skillsWanted: skill } });
    res.json({ message: 'Skill removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports.skillController = {
  addSkillOffered, removeSkillOffered, addSkillWanted, removeSkillWanted,
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Session Controller
 */
const { Session } = require('../models/models');

const scheduleSession = async (req, res) => {
  try {
    const { user2, skillName, sessionDate, duration, notes } = req.body;
    if (!user2 || !skillName || !sessionDate)
      return res.status(400).json({ message: 'user2, skillName and sessionDate are required' });

    const session = await Session.create({
      user1: req.user._id, user2, skillName, sessionDate, duration, notes,
    });
    const populated = await Session.findById(session._id)
      .populate('user1', 'name profileImage')
      .populate('user2', 'name profileImage');
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getMySessions = async (req, res) => {
  try {
    const sessions = await Session.find({
      $or: [{ user1: req.user._id }, { user2: req.user._id }],
    })
      .populate('user1', 'name profileImage')
      .populate('user2', 'name profileImage')
      .sort({ sessionDate: 1 });
    res.json(sessions);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateSessionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['scheduled','completed','cancelled'].includes(status))
      return res.status(400).json({ message: 'Invalid status' });

    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const participants = [session.user1.toString(), session.user2.toString()];
    if (!participants.includes(req.user._id.toString()))
      return res.status(403).json({ message: 'Not authorized' });

    session.sessionStatus = status;
    await session.save();
    res.json(session);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports.sessionController = { scheduleSession, getMySessions, updateSessionStatus };

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Review Controller
 */
const { Review } = require('../models/models');

const submitReview = async (req, res) => {
  try {
    const { reviewedUserId, rating, comment, sessionId } = req.body;
    if (!reviewedUserId || !rating || !sessionId)
      return res.status(400).json({ message: 'reviewedUserId, rating, sessionId required' });

    const exists = await Review.findOne({ reviewerId: req.user._id, sessionId });
    if (exists) return res.status(400).json({ message: 'Already reviewed this session' });

    const review = await Review.create({
      reviewerId: req.user._id, reviewedUserId, rating, comment, sessionId,
    });

    // Recalculate reputation score
    const allReviews = await Review.find({ reviewedUserId });
    const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
    await User.findByIdAndUpdate(reviewedUserId, {
      reputationScore: Math.round(avg * 10) / 10,
      reviewCount:     allReviews.length,
    });

    const populated = await Review.findById(review._id)
      .populate('reviewerId', 'name profileImage');
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getUserReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ reviewedUserId: req.params.userId })
      .populate('reviewerId', 'name profileImage')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports.reviewController = { submitReview, getUserReviews };
