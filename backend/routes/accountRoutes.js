const express = require('express');
const router = express.Router();
const { requireAuth, requireCustomer } = require('../middleware/authMiddleware');

const {
    createMyAccount,
    updateMyAccountStatus
} = require('../controllers/accountController');

router.post('/me', requireAuth, requireCustomer, createMyAccount);
router.patch('/:accountId/status', requireAuth, requireCustomer, updateMyAccountStatus);

module.exports = router;
