const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const {
    getMyDashboard,
    createCounterTransaction,
    reviewLoanApplication,
    updateBranchAccount,
    updateBranchCustomer,
} = require('../controllers/adminController');

const router = express.Router();

router.get('/me/dashboard', requireAuth, requireAdmin, getMyDashboard);
router.post(
    '/accounts/:accountId/counter-transaction',
    requireAuth,
    requireAdmin,
    createCounterTransaction
);
router.post(
    '/loan-applications/:applicationId/review',
    requireAuth,
    requireAdmin,
    reviewLoanApplication
);
router.put('/accounts/:accountId', requireAuth, requireAdmin, updateBranchAccount);
router.put('/customers/:customerId', requireAuth, requireAdmin, updateBranchCustomer);

module.exports = router;
