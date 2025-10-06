const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.registerUser);
router.post('/profile', authController.getProfile);
router.post('/login', authController.loginUser);
router.post('/requestResetPasswordLink', authController.requestResetPasswordLink);
router.post('/resetPassword', authController.resetPassword);

module.exports = router;
