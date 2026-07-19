const express = require('express');
const router = express.Router();
const { requireAuth, requireCustomer } = require('../middleware/authMiddleware');

const {
    getTransactionsByAccount,
    getTransactionDetails,
    createMyTransaction
} = require('../controllers/transactionController');

router.post('/me', requireAuth, requireCustomer, createMyTransaction);
router.get('/details/:accountId', getTransactionDetails);
router.get('/:accountId', getTransactionsByAccount);

module.exports = router;
