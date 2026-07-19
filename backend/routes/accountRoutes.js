const express = require('express');
const router = express.Router();
const { requireAuth, requireCustomer } = require('../middleware/authMiddleware');

const {
    getAccounts,
    getAccountById,
    getAccountDetails,
    createMyAccount,
    updateMyAccountStatus
} = require('../controllers/accountController');

router.post('/me', requireAuth, requireCustomer, createMyAccount);
router.patch('/:accountId/status', requireAuth, requireCustomer, updateMyAccountStatus);
router.get('/', getAccounts);
router.get('/details/:id', getAccountDetails);
router.get('/:id', getAccountById);

module.exports = router;
