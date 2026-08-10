import rateLimit from 'express-rate-limit';
import { AppError } from '../../utils/errors.js';

// Dynamically read configuration from environment variables with fallback defaults
const authWindowMs = process.env.AUTH_RATE_LIMIT_WINDOW_MS 
  ? parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10) 
  : 15 * 60 * 1000; // 15 minutes

const authLimit = process.env.AUTH_RATE_LIMIT_MAX 
  ? parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) 
  : 5;

const refreshWindowMs = process.env.REFRESH_RATE_LIMIT_WINDOW_MS 
  ? parseInt(process.env.REFRESH_RATE_LIMIT_WINDOW_MS, 10) 
  : 15 * 60 * 1000; // 15 minutes

const refreshLimit = process.env.REFRESH_RATE_LIMIT_MAX 
  ? parseInt(process.env.REFRESH_RATE_LIMIT_MAX, 10) 
  : 10;

/**
 * Rate limiter middleware for register and login endpoints to prevent brute force.
 */
export const authRateLimiter = rateLimit({
  windowMs: authWindowMs,
  limit: authLimit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new AppError('Too many attempts. Please try again later.', 429));
  },
});

/**
 * Rate limiter middleware for refresh token endpoint to prevent spamming.
 */
export const refreshRateLimiter = rateLimit({
  windowMs: refreshWindowMs,
  limit: refreshLimit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new AppError('Too many token refresh requests. Please try again later.', 429));
  },
});
