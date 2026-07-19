const express = require('express');
const router = express.Router();
const { requireAuth, requireCustomer } = require('../middleware/authMiddleware');
const { createMyTransfer } = require('../controllers/transferController');

router.post('/me', requireAuth, requireCustomer, createMyTransfer);

module.exports = router;
