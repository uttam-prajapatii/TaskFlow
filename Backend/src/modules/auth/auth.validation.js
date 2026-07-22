import { BadRequestError } from '../../utils/errors.js';

/**
 * Middleware to validate and sanitize registration inputs.
 */
export const validateRegister = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string') {
    return next(new BadRequestError('Valid email is required'));
  }

  if (!password || typeof password !== 'string') {
    return next(new BadRequestError('Password is required'));
  }

  // 1. Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new BadRequestError('Invalid email format'));
  }

  // 2. Validate password strength
  // - Minimum 8 characters
  if (password.length < 8) {
    return next(new BadRequestError('Password must be at least 8 characters long'));
  }

  // - Mixed case (upper and lower)
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  if (!hasUppercase || !hasLowercase) {
    return next(new BadRequestError('Password must contain both uppercase and lowercase letters'));
  }

  // - Contains at least one number
  const hasNumber = /[0-9]/.test(password);
  if (!hasNumber) {
    return next(new BadRequestError('Password must contain at least one number'));
  }

  // - Contains at least one special character
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>\-_]/.test(password);
  if (!hasSpecial) {
    return next(new BadRequestError('Password must contain at least one special character'));
  }

  // Sanitize inputs
  req.body.email = email.trim().toLowerCase();

  next();
};

/**
 * Middleware to validate and sanitize login inputs.
 */
export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string') {
    return next(new BadRequestError('Email is required'));
  }

  if (!password || typeof password !== 'string') {
    return next(new BadRequestError('Password is required'));
  }

  // Sanitize email
  req.body.email = email.trim().toLowerCase();

  next();
};
