const express = require('express');
const router = express.Router();
const { requireAuth, requireCustomer } = require('../middleware/authMiddleware');

const {
    getCustomers,
    getCustomerById,
    getMyDashboard,
    updateMyProfile,
    applyForLoan,
    repayMyLoan,
} = require('../controllers/customerController');

router.get('/me/dashboard', requireAuth, requireCustomer, getMyDashboard);
router.put('/me/profile', requireAuth, requireCustomer, updateMyProfile);
router.post('/me/loan-applications', requireAuth, requireCustomer, applyForLoan);
router.post('/me/loans/:loanId/repay', requireAuth, requireCustomer, repayMyLoan);
router.get('/', getCustomers);
router.get('/:id', getCustomerById);

module.exports = router;
