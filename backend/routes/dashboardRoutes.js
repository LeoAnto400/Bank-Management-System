const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

const { getDashboardStats } = require('../controllers/dashboardController');

router.get('/', requireAuth, requireAdmin, getDashboardStats);

module.exports = router;