const express = require('express');
const { adminLogin, login, signup } = require('../controllers/authController');
const { loginLimiter, signupLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

router.post('/login', loginLimiter, login);
router.post('/admin/login', loginLimiter, adminLogin);
router.post('/signup', signupLimiter, signup);

module.exports = router;
