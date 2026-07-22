// skillRoutes.js
const express = require('express');
const router  = express.Router();
const { skillController } = require('../controllers/otherControllers');
const { protect } = require('../middleware/authMiddleware');

router.post('/offer',   protect, skillController.addSkillOffered);
router.delete('/offer', protect, skillController.removeSkillOffered);
router.post('/want',    protect, skillController.addSkillWanted);
router.delete('/want',  protect, skillController.removeSkillWanted);

module.exports = router;
