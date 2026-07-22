// sessionRoutes.js
const express = require('express');
const router  = express.Router();
const { sessionController } = require('../controllers/otherControllers');
const { protect } = require('../middleware/authMiddleware');

router.post('/',           protect, sessionController.scheduleSession);
router.get('/',            protect, sessionController.getMySessions);
router.put('/:id/status',  protect, sessionController.updateSessionStatus);

module.exports = router;
