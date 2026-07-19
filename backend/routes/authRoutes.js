const express = require('express');
const { adminLogin, login, signup } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.post('/admin/login', adminLogin);
router.post('/signup', signup);

module.exports = router;
