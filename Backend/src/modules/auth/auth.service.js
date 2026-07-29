import authRepository from './auth.repository.js';
import tokenService from './token.service.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { BadRequestError, UnauthorizedError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

class AuthService {
  /**
   * Register a new user and return auth tokens.
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
    });

    logger.info(`User registered successfully: ${email}`, { userId: user._id });

    const tokens = await tokenService.generateAuthTokens(user);

    // Exclude password from returned user object
    const userResponse = {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };

    return { user: userResponse, tokens };
  }

  /**
   * Log in user, verify credentials, and return auth tokens.
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

    logger.info(`User logged in successfully: ${email}`, { userId: user._id });

    const tokens = await tokenService.generateAuthTokens(user);

    const userResponse = {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
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
}

export default new AuthService();
