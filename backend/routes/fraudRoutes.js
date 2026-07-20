const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

const {
    getFrauds,
    getHighRiskFrauds
} = require('../controllers/fraudController');

router.get('/', requireAuth, requireAdmin, getFrauds);
router.get('/high-risk', requireAuth, requireAdmin, getHighRiskFrauds);

module.exports = router;