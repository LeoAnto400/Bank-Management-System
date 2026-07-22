const express = require('express');
const router = express.Router();
const { requireAuth, requireCustomer } = require('../middleware/authMiddleware');
const { issueMyCard, updateMyCardStatus } = require('../controllers/cardController');

router.post('/me', requireAuth, requireCustomer, issueMyCard);
router.patch('/:cardId/status', requireAuth, requireCustomer, updateMyCardStatus);

module.exports = router;
