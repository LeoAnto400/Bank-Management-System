const express = require('express');
const router = express.Router();
const { requireAuth, requireCustomer } = require('../middleware/authMiddleware');

const {
    createMyTransaction
} = require('../controllers/transactionController');

router.post('/me', requireAuth, requireCustomer, createMyTransaction);

module.exports = router;
