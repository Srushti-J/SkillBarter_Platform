const express = require('express');
const router  = express.Router();
const { getMatches } = require('../controllers/matchController');
const { protect }    = require('../middleware/authMiddleware');

// GET /api/match  — get AI-powered skill partner recommendations
router.get('/', protect, getMatches);

module.exports = router;
