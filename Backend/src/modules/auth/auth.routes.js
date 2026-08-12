import express from 'express';
import authController from './auth.controller.js';
import {
  validateRegister,
  validateLogin,
  validateVerifyOtp,
  validateResendOtp,
  validateUpdateMe,
  validateUpdatePassword,
  validateForgotPassword,
  validateResetPassword
} from './auth.validation.js';
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
router.post('/forgot-password', authRateLimiter, validateForgotPassword, authController.forgotPassword);
router.post('/reset-password/:token', authRateLimiter, validateResetPassword, authController.resetPassword);

// Protected routes
router.get('/me', protect, authController.getMe);
router.patch('/me', protect, validateUpdateMe, authController.updateMe);
router.patch('/update-password', protect, validateUpdatePassword, authController.updatePassword);

export default router;
