const express = require('express');
const router = express.Router();

const {
    getFrauds,
    getHighRiskFrauds
} = require('../controllers/fraudController');

router.get('/', getFrauds);
router.get('/high-risk', getHighRiskFrauds);

module.exports = router;