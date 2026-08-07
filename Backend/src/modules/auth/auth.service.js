import authRepository from './auth.repository.js';
import tokenService from './token.service.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { BadRequestError, UnauthorizedError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';
import redisClient from '../../config/redis.js';
import { enqueueEmail } from '../email/email.queue.js';

class AuthService {
  /**
   * Register a new user, generate verification OTP, and enqueue email.
   */
  async register(email, password, fullName) {
    const existingUser = await authRepository.findUserByEmail(email);
    if (existingUser) {
      logger.warn(`Registration failed: email ${email} is already registered.`);
      throw new BadRequestError('Email is already registered');
    }

    const hashedPassword = await hashPassword(password);
    const user = await authRepository.createUser({
      email,
      password: hashedPassword,
      fullName,
      isVerified: false,
    });

    logger.info(`User registered successfully, pending verification: ${email}`, { userId: user._id });

    // Generate 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // Cache the OTP code in Redis for 15 minutes (900 seconds)
    await redisClient.set(`otp:${email}`, otp, 'EX', 900);

    // Enqueue sending OTP email via background queue
    await enqueueEmail('sendOtp', {
      toEmail: user.email,
      otp,
    });

    // Exclude password from returned user object
    const userResponse = {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };

    return { user: userResponse };
  }

  /**
   * Log in user, verify credentials.
   * If the user is unverified, sends a new verification OTP and returns verification instructions.
   */
  async login(email, password) {
    // We must explicitly select the password because it is set to select: false in the model
    const user = await authRepository.findUserByEmail(email, true);
    if (!user) {
      logger.warn(`Login failed: user with email ${email} not found.`);
      // Generic error to prevent user enumeration
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      logger.warn(`Login failed: invalid password for email ${email}.`, { userId: user._id });
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      logger.warn(`Login failed: user account is inactive for email ${email}.`, { userId: user._id });
      throw new UnauthorizedError('User account is deactivated');
    }

    // Check if the user is verified
    if (!user.isVerified) {
      logger.info(`Login attempted for unverified user: ${email}. Re-sending OTP.`, { userId: user._id });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await redisClient.set(`otp:${email}`, otp, 'EX', 900);
      await enqueueEmail('sendOtp', {
        toEmail: user.email,
        otp,
      });

      return {
        message: 'Verification OTP sent to your email',
        email: user.email,
        isVerified: false,
      };
    }

    logger.info(`User logged in successfully: ${email}`, { userId: user._id });

    const tokens = await tokenService.generateAuthTokens(user);

    const userResponse = {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };

    return { user: userResponse, tokens };
  }

  /**
   * Rotate refresh token and return a new token pair.
   */
  async refresh(refreshToken) {
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token is required');
    }
    return tokenService.rotateRefreshToken(refreshToken);
  }

  /**
   * Revoke the current session/refresh token.
   */
  async logout(refreshToken) {
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token is required');
    }
    await tokenService.revokeRefreshToken(refreshToken);
    return { message: 'Logged out successfully' };
  }

  /**
   * Verify the 6-digit OTP code, activate the user account, and generate auth tokens.
   */
  async verifyOtp(email, otp) {
    const user = await authRepository.findUserByEmail(email);
    if (!user) {
      throw new BadRequestError('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestError('Email is already verified');
    }

    // Retrieve cached OTP code from Redis
    const cachedOtp = await redisClient.get(`otp:${email}`);
    if (!cachedOtp) {
      throw new BadRequestError('Verification code has expired or was not requested');
    }

    if (cachedOtp !== otp) {
      logger.warn(`OTP verification failed: invalid OTP for email ${email}.`, { userId: user._id });
      throw new BadRequestError('Invalid verification code');
    }

    // Mark user as verified and clear the cached OTP
    user.isVerified = true;
    await user.save();
    await redisClient.del(`otp:${email}`);

    logger.info(`User email verified successfully: ${email}`, { userId: user._id });

    const tokens = await tokenService.generateAuthTokens(user);

    const userResponse = {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };

    return { user: userResponse, tokens };
  }

  /**
   * Regenerate and resend a verification OTP code.
   */
  async resendOtp(email) {
    const user = await authRepository.findUserByEmail(email);
    if (!user) {
      throw new BadRequestError('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestError('Email is already verified');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await redisClient.set(`otp:${email}`, otp, 'EX', 900);
    await enqueueEmail('sendOtp', {
      toEmail: user.email,
      otp,
    });

    logger.info(`Verification OTP resent successfully to ${email}`, { userId: user._id });
  }
}

export default new AuthService();
