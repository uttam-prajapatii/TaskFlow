import { describe, test, expect, beforeAll, afterAll, beforeEach, mock } from 'bun:test';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authService from '../src/modules/auth/auth.service.js';
import tokenService from '../src/modules/auth/token.service.js';
import User from '../src/modules/auth/user.model.js';
import RefreshToken from '../src/modules/auth/refreshToken.model.js';
import redisClient from '../src/config/redis.js';
import { UnauthorizedError, BadRequestError } from '../src/utils/errors.js';
import { cookieConfig } from '../src/modules/auth/auth.utils.js';

// Load environment variables for the test context
process.env.NODE_ENV = 'test';
dotenv.config();

// Ensure test secrets are set if not present in env
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_access_secret_key_12345';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_key_12345';
process.env.JWT_ACCESS_EXPIRY = '5m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.JWT_ACCESS_COOKIE_NAME = 'customAccessCookie';
process.env.JWT_REFRESH_COOKIE_NAME = 'customRefreshCookie';

describe('Authentication System Tests', () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/taskflow_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  });

  afterAll(async () => {
    // Clean up test collections and close connections
    await User.deleteMany({});
    await RefreshToken.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await RefreshToken.deleteMany({});
    // Flush the OTP keys from Redis
    const keys = await redisClient.keys('otp:*');
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  });

  // ==========================================
  // Register Tests
  // ==========================================
  describe('User Registration', () => {
    test('should register a user with valid email and strong password', async () => {
      const email = 'test@example.com';
      const password = 'Password123!';
      const fullName = 'John Doe';

      const result = await authService.register(email, password, fullName);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(email);
      expect(result.user.fullName).toBe(fullName);
      expect(result.user.password).toBeUndefined(); // select: false/removed
      expect(result.user.isVerified).toBe(false);

      const userInDb = await User.findOne({ email });
      expect(userInDb).toBeDefined();
      expect(userInDb.email).toBe(email);
      expect(userInDb.fullName).toBe(fullName);
      expect(userInDb.isVerified).toBe(false);

      // Verify OTP is generated in Redis
      const otp = await redisClient.get(`otp:${email}`);
      expect(otp).toBeDefined();
      expect(otp).toHaveLength(6);
    });

    test('should reject duplicate registration', async () => {
      const email = 'duplicate@example.com';
      const password = 'Password123!';
      const fullName = 'Test User';

      await authService.register(email, password, fullName);

      let errorThrown;
      try {
        await authService.register(email, password, fullName);
      } catch (err) {
        errorThrown = err;
      }

      expect(errorThrown).toBeDefined();
      expect(errorThrown.message).toBe('Email is already registered');
    });
  });

  // ==========================================
  // Login Tests
  // ==========================================
  describe('User Login', () => {
    test('should login with correct credentials if verified', async () => {
      const email = 'login@example.com';
      const password = 'Password123!';
      const fullName = 'Test User';

      await authService.register(email, password, fullName);
      await User.updateOne({ email }, { isVerified: true });
      const result = await authService.login(email, password);

      expect(result.user.email).toBe(email);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    test('should reject invalid password with generic error message', async () => {
      const email = 'login_fail@example.com';
      const password = 'Password123!';
      const fullName = 'Test User';

      await authService.register(email, password, fullName);
      await User.updateOne({ email }, { isVerified: true });

      let errorThrown;
      try {
        await authService.login(email, 'WrongPassword1!');
      } catch (err) {
        errorThrown = err;
      }

      expect(errorThrown).toBeDefined();
      expect(errorThrown.message).toBe('Invalid email or password');
    });

    test('should reject unregistered email with generic error message', async () => {
      let errorThrown;
      try {
        await authService.login('notregistered@example.com', 'Password123!');
      } catch (err) {
        errorThrown = err;
      }

      expect(errorThrown).toBeDefined();
      expect(errorThrown.message).toBe('Invalid email or password');
    });
  });

  // ==========================================
  // OTP Verification Tests
  // ==========================================
  describe('OTP Verification Flow', () => {
    test('should send OTP on login if user is unverified', async () => {
      const email = 'unverified-login@example.com';
      const password = 'Password123!';
      const fullName = 'Unverified User';

      await authService.register(email, password, fullName);
      
      const result = await authService.login(email, password);
      expect(result.isVerified).toBe(false);
      expect(result.message).toBe('Verification OTP sent to your email');

      // Verify OTP is in Redis
      const otp = await redisClient.get(`otp:${email}`);
      expect(otp).toBeDefined();
      expect(otp).toHaveLength(6);
    });

    test('should verify OTP and activate account successfully', async () => {
      const email = 'verify-success@example.com';
      const password = 'Password123!';
      const fullName = 'Test User';

      await authService.register(email, password, fullName);
      const otp = await redisClient.get(`otp:${email}`);
      
      const result = await authService.verifyOtp(email, otp);
      expect(result.user.isVerified).toBe(true);
      expect(result.tokens.accessToken).toBeDefined();

      const userInDb = await User.findOne({ email });
      expect(userInDb.isVerified).toBe(true);

      // Verify OTP is removed from Redis
      const cachedOtp = await redisClient.get(`otp:${email}`);
      expect(cachedOtp).toBeNull();
    });

    test('should reject invalid OTP', async () => {
      const email = 'verify-invalid@example.com';
      const password = 'Password123!';
      const fullName = 'Test User';

      await authService.register(email, password, fullName);

      let errorThrown;
      try {
        await authService.verifyOtp(email, '999999');
      } catch (err) {
        errorThrown = err;
      }

      expect(errorThrown).toBeDefined();
      expect(errorThrown.message).toBe('Invalid verification code');
    });

    test('should resend OTP code successfully', async () => {
      const email = 'resend-otp@example.com';
      const password = 'Password123!';
      const fullName = 'Test User';

      await authService.register(email, password, fullName);
      const initialOtp = await redisClient.get(`otp:${email}`);

      await authService.resendOtp(email);
      const newOtp = await redisClient.get(`otp:${email}`);

      expect(newOtp).toBeDefined();
      expect(newOtp).not.toBe(initialOtp);
    });
  });

  // ==========================================
  // Refresh & Rotation Tests
  // ==========================================
  describe('Token Refresh & Rotation', () => {
    test('should refresh tokens with a valid refresh token', async () => {
      const email = 'refresh@example.com';
      const password = 'Password123!';
      const fullName = 'Test User';

      await authService.register(email, password, fullName);
      const otp = await redisClient.get(`otp:${email}`);
      const regResult = await authService.verifyOtp(email, otp);
      const oldRefreshToken = regResult.tokens.refreshToken;

      const refreshResult = await authService.refresh(oldRefreshToken);

      expect(refreshResult.accessToken).toBeDefined();
      expect(refreshResult.refreshToken).toBeDefined();
      expect(refreshResult.refreshToken).not.toBe(oldRefreshToken);

      const oldHash = tokenService.hashToken(oldRefreshToken);
      const oldTokenRecord = await RefreshToken.findOne({ tokenHash: oldHash });
      expect(oldTokenRecord.isRevoked).toBe(true);
    });

    test('should detect refresh token reuse and revoke all sessions', async () => {
      const email = 'reuse@example.com';
      const password = 'Password123!';
      const fullName = 'Test User';

      await authService.register(email, password, fullName);
      const otp = await redisClient.get(`otp:${email}`);
      const regResult = await authService.verifyOtp(email, otp);
      const oldRefreshToken = regResult.tokens.refreshToken;

      await authService.refresh(oldRefreshToken);

      const oldHash = tokenService.hashToken(oldRefreshToken);
      await RefreshToken.updateOne(
        { tokenHash: oldHash },
        { revokedAt: new Date(Date.now() - 5000) }
      );

      const anotherSession = await tokenService.generateAuthTokens(
        await User.findOne({ email })
      );

      let errorThrown;
      try {
        await authService.refresh(oldRefreshToken);
      } catch (err) {
        errorThrown = err;
      }

      expect(errorThrown).toBeDefined();
      expect(errorThrown.message).toBe(
        'Refresh token reuse detected. All sessions revoked. Please log in again.'
      );

      const activeTokens = await RefreshToken.find({
        userId: regResult.user._id,
        isRevoked: false,
      });
      expect(activeTokens).toHaveLength(0);
    });

    test('should handle concurrent/race condition refreshes safely', async () => {
      const email = 'race@example.com';
      const password = 'Password123!';
      const fullName = 'Test User';

      await authService.register(email, password, fullName);
      const otp = await redisClient.get(`otp:${email}`);
      const regResult = await authService.verifyOtp(email, otp);
      const oldRefreshToken = regResult.tokens.refreshToken;

      await authService.refresh(oldRefreshToken);

      let errorThrown;
      try {
        await authService.refresh(oldRefreshToken);
      } catch (err) {
        errorThrown = err;
      }

      expect(errorThrown).toBeDefined();
      expect(errorThrown.message).toBe('Token is rotating, please retry');

      const user = await User.findOne({ email });
      const checkTokenPair = await tokenService.generateAuthTokens(user);

      const freshHash = tokenService.hashToken(checkTokenPair.refreshToken);
      const freshRecord = await RefreshToken.findOne({ tokenHash: freshHash });
      expect(freshRecord.isRevoked).toBe(false);
    });
  });

  // ==========================================
  // Logout Tests
  // ==========================================
  describe('User Logout', () => {
    test('should revoke token on logout', async () => {
      const email = 'logout@example.com';
      const password = 'Password123!';
      const fullName = 'Test User';

      await authService.register(email, password, fullName);
      const otp = await redisClient.get(`otp:${email}`);
      const regResult = await authService.verifyOtp(email, otp);
      const refreshToken = regResult.tokens.refreshToken;

      await authService.logout(refreshToken);

      const hash = tokenService.hashToken(refreshToken);
      const record = await RefreshToken.findOne({ tokenHash: hash });
      expect(record.isRevoked).toBe(true);

      let errorThrown;
      try {
        await authService.refresh(refreshToken);
      } catch (err) {
        errorThrown = err;
      }

      expect(errorThrown).toBeDefined();
    });
  });

  // ==========================================
  // Hybrid Cookie + Header Tests
  // ==========================================
  describe('Hybrid Cookie + Header Authentication', () => {
    test('should extract access token from cookies in protect middleware', async () => {
      const email = 'cookie-auth@example.com';
      const password = 'Password123!';
      const fullName = 'Test User';
      
      await authService.register(email, password, fullName);
      const otp = await redisClient.get(`otp:${email}`);
      const regResult = await authService.verifyOtp(email, otp);
      const accessCookieName = cookieConfig.accessToken.name;
      
      const req = {
        headers: {},
        cookies: {
          [accessCookieName]: regResult.tokens.accessToken,
        },
      };
      
      const res = {};
      const next = mock(() => {});
      
      const { protect } = await import('../src/modules/auth/auth.middleware.js');
      await protect(req, res, next);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.email).toBe(email);
    });

    test('should read refresh token from cookies in controllers', async () => {
      const email = 'cookie-refresh@example.com';
      const password = 'Password123!';
      const fullName = 'Test User';
      
      await authService.register(email, password, fullName);
      const otp = await redisClient.get(`otp:${email}`);
      const regResult = await authService.verifyOtp(email, otp);
      const refreshCookieName = cookieConfig.refreshToken.name;
      
      const req = {
        body: {},
        cookies: {
          [refreshCookieName]: regResult.tokens.refreshToken,
        },
      };
      
      const res = {
        cookie: mock(() => {}),
        status: mock(function() { return this; }),
        json: mock(function() { return this; }),
      };
      
      const next = mock((err) => {
        if (err) console.error("ERROR IN CONTROLLER:", err);
      });
      
      const { default: authController } = await import('../src/modules/auth/auth.controller.js');
      await authController.refresh(req, res, next);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(res.cookie).toHaveBeenCalled();
    });
  });
});
