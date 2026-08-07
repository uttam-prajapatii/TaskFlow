import express from 'express';
import authController from './auth.controller.js';
import { validateRegister, validateLogin, validateVerifyOtp, validateResendOtp } from './auth.validation.js';
import { protect } from './auth.middleware.js';
import { authRateLimiter, refreshRateLimiter } from './auth.rateLimiter.js';

const router = express.Router();

// Public routes
router.post('/register', authRateLimiter, validateRegister, authController.register);
router.post('/login', authRateLimiter, validateLogin, authController.login);
router.post('/refresh', refreshRateLimiter, authController.refresh);
router.post('/logout', authController.logout);
router.post('/verify-otp', authRateLimiter, validateVerifyOtp, authController.verifyOtp);
router.post('/resend-otp', authRateLimiter, validateResendOtp, authController.resendOtp);

// Protected routes
router.get('/me', protect, authController.getMe);

export default router;
