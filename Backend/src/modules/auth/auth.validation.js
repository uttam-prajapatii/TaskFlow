import { BadRequestError } from '../../utils/errors.js';

/**
 * Middleware to validate and sanitize registration inputs.
 */
export const validateRegister = (req, res, next) => {
  const { email, password, fullName } = req.body;

  if (!fullName || typeof fullName !== 'string') {
    return next(new BadRequestError('Full name is required'));
  }

  if (!email || typeof email !== 'string') {
    return next(new BadRequestError('Valid email is required'));
  }

  if (!password || typeof password !== 'string') {
    return next(new BadRequestError('Password is required'));
  }

  // 0. Validate and sanitize full name
  const trimmedName = fullName.trim();
  if (trimmedName.length < 2 || trimmedName.length > 50) {
    return next(new BadRequestError('Full name must be between 2 and 50 characters long'));
  }

  // Permissive name regex allowing letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
  if (!nameRegex.test(trimmedName)) {
    return next(new BadRequestError('Full name can only contain letters, spaces, hyphens, and apostrophes'));
  }

  // 1. Validate email format
  const emailRegex = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
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
  const hasNumber = /\d/.test(password);
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
  req.body.fullName = trimmedName;

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

/**
 * Middleware to validate verify-otp input.
 */
export const validateVerifyOtp = (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || typeof email !== 'string') {
    return next(new BadRequestError('Email is required'));
  }

  const emailRegex = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
  if (!emailRegex.test(email)) {
    return next(new BadRequestError('Invalid email format'));
  }

  if (!otp || typeof otp !== 'string') {
    return next(new BadRequestError('OTP is required'));
  }

  const otpRegex = /^\d{6}$/;
  if (!otpRegex.test(otp.trim())) {
    return next(new BadRequestError('OTP must be a 6-digit number'));
  }

  // Sanitize inputs
  req.body.email = email.trim().toLowerCase();
  req.body.otp = otp.trim();

  next();
};

/**
 * Middleware to validate resend-otp input.
 */
export const validateResendOtp = (req, res, next) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return next(new BadRequestError('Email is required'));
  }

  const emailRegex = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
  if (!emailRegex.test(email)) {
    return next(new BadRequestError('Invalid email format'));
  }

  // Sanitize email
  req.body.email = email.trim().toLowerCase();

  next();
};
