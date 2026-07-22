const express = require('express');
const router  = express.Router();
const { reviewController } = require('../controllers/otherControllers');
const { protect } = require('../middleware/authMiddleware');

router.post('/',              protect, reviewController.submitReview);
router.get('/user/:userId',   protect, reviewController.getUserReviews);

module.exports = router;
