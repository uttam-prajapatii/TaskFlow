import rateLimit from 'express-rate-limit';
import { AppError } from '../../utils/errors.js';

/**
 * Rate limiter middleware for register and login endpoints to prevent brute force.
 * Limits each IP to 15 requests per 15 minutes.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new AppError('Too many attempts. Please try again after 15 minutes.', 429));
  },
});

/**
 * Rate limiter middleware for refresh token endpoint to prevent spamming.
 * Limits each IP to 30 requests per 15 minutes.
 */
export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new AppError('Too many token refresh requests. Please try again later.', 429));
  },
});
