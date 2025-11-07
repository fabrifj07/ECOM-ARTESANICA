const express = require('express');
const router = express.Router();
const {
    register,
    login,
    logout,
    getMe,
    updateDetails,
    updatePassword,
    forgotPassword,
    resetPassword,
    verifyEmail
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');

// Rutas públicas
router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
router.get('/verify-email/:verificationtoken', verifyEmail);

// Rutas protegidas (requieren autenticación)
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);

module.exports = router;
