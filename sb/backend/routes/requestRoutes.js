const express = require('express');
const router  = express.Router();
const { sendRequest, updateRequestStatus, getMyRequests } = require('../controllers/requestController');
const { protect } = require('../middleware/authMiddleware');

router.post('/',            protect, sendRequest);
router.get('/',             protect, getMyRequests);
router.put('/:id/status',   protect, updateRequestStatus);

module.exports = router;
