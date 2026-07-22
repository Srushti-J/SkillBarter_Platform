const express = require('express');
const router  = express.Router();
const { getOnlineUsers, getUserStatus } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.get('/online',       protect, getOnlineUsers);
router.get('/:id/status',   protect, getUserStatus);

module.exports = router;
