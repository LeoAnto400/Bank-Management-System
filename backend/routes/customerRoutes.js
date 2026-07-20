const express = require('express');
const router = express.Router();
const { requireAuth, requireCustomer } = require('../middleware/authMiddleware');

const {
    getMyDashboard,
    updateMyProfile,
    applyForLoan,
    repayMyLoan,
} = require('../controllers/customerController');

router.get('/me/dashboard', requireAuth, requireCustomer, getMyDashboard);
router.put('/me/profile', requireAuth, requireCustomer, updateMyProfile);
router.post('/me/loan-applications', requireAuth, requireCustomer, applyForLoan);
router.post('/me/loans/:loanId/repay', requireAuth, requireCustomer, repayMyLoan);

module.exports = router;
