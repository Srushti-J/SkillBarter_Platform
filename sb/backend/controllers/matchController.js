/**
 * Match Controller — Real Users Only
 * ====================================
 * FIXES:
 *  ✅ Only users with complete profiles appear in matches
 *  ✅ Logged-in user never sees themselves
 *  ✅ No hardcoded/mock data — pure MongoDB
 *  ✅ Calls Python AI service; falls back to complementary overlap scoring
 *  ✅ Profile completeness = name + skillsOffered≥1 + skillsWanted≥1
 */

const axios = require('axios');
const User  = require('../models/User');

const getMatches = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id).select('-password');

    // ── Guard: current user must have a complete profile ──────────────────────
    if (
      !currentUser.name ||
      currentUser.skillsOffered.length === 0 ||
      currentUser.skillsWanted.length  === 0
    ) {
      return res.status(400).json({
        message: 'Complete your profile first — add at least one skill you offer and one skill you want.',
        profileIncomplete: true,
      });
    }

    // ── Fetch ONLY complete profiles (excludes current user) ──────────────────
    const candidates = await User.find({
      _id:           { $ne: req.user._id }, // exclude self
      name:          { $exists: true, $ne: '' },
      skillsOffered: { $exists: true, $not: { $size: 0 } },
      skillsWanted:  { $exists: true, $not: { $size: 0 } },
    }).select('-password');

    if (candidates.length === 0) {
      return res.json({ matches: [], message: 'No other users with complete profiles yet.' });
    }

    // ── Build payload for Python AI service ───────────────────────────────────
    const payload = {
      currentUser: {
        id:            currentUser._id.toString(),
        skillsOffered: currentUser.skillsOffered,
        skillsWanted:  currentUser.skillsWanted,
      },
      allUsers: candidates.map((u) => ({
        id:             u._id.toString(),
        name:           u.name,
        bio:            u.bio,
        profileImage:   u.profileImage,
        skillsOffered:  u.skillsOffered,
        skillsWanted:   u.skillsWanted,
        reputationScore:u.reputationScore,
        reviewCount:    u.reviewCount,
        lastSeen:       u.lastSeen,
      })),
    };

    // ── Try AI service ─────────────────────────────────────────────────────────
    try {
      const aiRes = await axios.post(
        process.env.AI_SERVICE_URL || 'http://localhost:8000/recommend',
        payload,
        { timeout: 5000 }
      );
      return res.json({ matches: aiRes.data.matches, source: 'ai' });
    } catch (aiError) {
      // AI service is down — use local complementary overlap scoring
      console.warn('⚠️  AI service unavailable, using fallback scoring');
    }

    // ── Fallback: complementary overlap scoring ────────────────────────────────
    // "You offer what they want AND they offer what you want"
    const scored = candidates
      .map((candidate) => {
        const myOfferedSet  = new Set(currentUser.skillsOffered.map((s) => s.toLowerCase()));
        const myWantedSet   = new Set(currentUser.skillsWanted.map((s) => s.toLowerCase()));
        const theirOffered  = new Set(candidate.skillsOffered.map((s) => s.toLowerCase()));
        const theirWanted   = new Set(candidate.skillsWanted.map((s) => s.toLowerCase()));

        // How many of MY offered skills do THEY want?
        const aTeachesB = [...myOfferedSet].filter((s) => theirWanted.has(s)).length;
        // How many of THEIR offered skills do I want?
        const bTeachesA = [...theirOffered].filter((s) => myWantedSet.has(s)).length;

        const totalSkills = myOfferedSet.size + theirOffered.size;
        const rawScore    = totalSkills > 0
          ? ((aTeachesB + bTeachesA) / totalSkills) * 100
          : 0;

        // Tiny bonus for reputation
        const repBonus = candidate.reputationScore * 2;

        return {
          id:               candidate._id.toString(),
          name:             candidate.name,
          bio:              candidate.bio,
          profileImage:     candidate.profileImage,
          skillsOffered:    candidate.skillsOffered,
          skillsWanted:     candidate.skillsWanted,
          reputationScore:  candidate.reputationScore,
          reviewCount:      candidate.reviewCount,
          lastSeen:         candidate.lastSeen,
          matchScore:       Math.min(Math.round(rawScore + repBonus), 100),
          tfidfScore:       0,
          complementaryScore: Math.round(rawScore),
        };
      })
      .filter((m) => m.matchScore > 0)          // only show actual matches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);

    res.json({ matches: scored, source: 'fallback' });
  } catch (err) {
    console.error('Match error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getMatches };
