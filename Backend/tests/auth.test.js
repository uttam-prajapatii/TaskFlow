import { describe, test, expect, beforeAll, afterAll, beforeEach, mock } from 'bun:test';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authService from '../src/modules/auth/auth.service.js';
import tokenService from '../src/modules/auth/token.service.js';
import User from '../src/modules/auth/user.model.js';
import RefreshToken from '../src/modules/auth/refreshToken.model.js';
import { UnauthorizedError, BadRequestError } from '../src/utils/errors.js';

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
    // Clean up test collections and close connection
    await User.deleteMany({});
    await RefreshToken.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await RefreshToken.deleteMany({});
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
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();

      const userInDb = await User.findOne({ email });
      expect(userInDb).toBeDefined();
      expect(userInDb.email).toBe(email);
      expect(userInDb.fullName).toBe(fullName);
    });

    test('should reject duplicate registration', async () => {
      const email = 'duplicate@example.com';
      const password = 'Password123!';

      await authService.register(email, password);

      let errorThrown;
      try {
        await authService.register(email, password);
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
    test('should login with correct credentials', async () => {
      const email = 'login@example.com';
      const password = 'Password123!';

      await authService.register(email, password);
      const result = await authService.login(email, password);

      expect(result.user.email).toBe(email);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    test('should reject invalid password with generic error message', async () => {
      const email = 'login_fail@example.com';
      const password = 'Password123!';

      await authService.register(email, password);

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
  // Refresh & Rotation Tests
  // ==========================================
  describe('Token Refresh & Rotation', () => {
    test('should refresh tokens with a valid refresh token', async () => {
      const email = 'refresh@example.com';
      const password = 'Password123!';

      const regResult = await authService.register(email, password);
      const oldRefreshToken = regResult.tokens.refreshToken;

      // Wait a moment so creation timestamps differ if needed, then refresh
      const refreshResult = await authService.refresh(oldRefreshToken);

      expect(refreshResult.accessToken).toBeDefined();
      expect(refreshResult.refreshToken).toBeDefined();
      expect(refreshResult.refreshToken).not.toBe(oldRefreshToken);

      // Verify the old token is marked revoked
      const oldHash = tokenService.hashToken(oldRefreshToken);
      const oldTokenRecord = await RefreshToken.findOne({ tokenHash: oldHash });
      expect(oldTokenRecord.isRevoked).toBe(true);
    });

    test('should detect refresh token reuse and revoke all sessions', async () => {
      const email = 'reuse@example.com';
      const password = 'Password123!';

      const regResult = await authService.register(email, password);
      const oldRefreshToken = regResult.tokens.refreshToken;

      // 1st refresh: rotates successfully
      await authService.refresh(oldRefreshToken);

      // Simulate waiting beyond the 2-second race-condition grace period
      // by manually setting the first token's revokedAt time to 5 seconds ago
      const oldHash = tokenService.hashToken(oldRefreshToken);
      await RefreshToken.updateOne(
        { tokenHash: oldHash },
        { revokedAt: new Date(Date.now() - 5000) }
      );

      // Create an additional active session/token for testing cascade revocation
      const anotherSession = await tokenService.generateAuthTokens(
        await User.findOne({ email })
      );

      // 2nd refresh: should trigger reuse compromise detection
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

      // Verify that all refresh tokens for this user are now revoked
      const activeTokens = await RefreshToken.find({
        userId: regResult.user._id,
        isRevoked: false,
      });
    expect(activeTokens).toHaveLength(0);
    });

    test('should handle concurrent/race condition refreshes safely', async () => {
      const email = 'race@example.com';
      const password = 'Password123!';

      const regResult = await authService.register(email, password);
      const oldRefreshToken = regResult.tokens.refreshToken;

      // Simulate a concurrent second request hitting within the 2-second grace period.
      // We will perform the first refresh:
      await authService.refresh(oldRefreshToken);

      // A concurrent request arriving immediately with the same token should reject
      // with a race-condition retry message rather than revoking everything.
      let errorThrown;
      try {
        await authService.refresh(oldRefreshToken);
      } catch (err) {
        errorThrown = err;
      }

      expect(errorThrown).toBeDefined();
      expect(errorThrown.message).toBe('Token is rotating, please retry');

      // Ensure that other session refresh tokens are NOT cascade-revoked!
      const user = await User.findOne({ email });
      // Create another session token
      const checkTokenPair = await tokenService.generateAuthTokens(user);

      // Verify this session is still valid (not revoked by the concurrent request)
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

      const regResult = await authService.register(email, password);
      const refreshToken = regResult.tokens.refreshToken;

      await authService.logout(refreshToken);

      const hash = tokenService.hashToken(refreshToken);
      const record = await RefreshToken.findOne({ tokenHash: hash });
      expect(record.isRevoked).toBe(true);

      // Trying to refresh with the logged out token should fail
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
      const regResult = await authService.register(email, password);
      const accessCookieName = process.env.JWT_ACCESS_COOKIE_NAME || 'accessToken';
      
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
      
      // Delay to let asyncHandler complete its execution
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.email).toBe(email);
    });

    test('should read refresh token from cookies in controllers', async () => {
      const email = 'cookie-refresh@example.com';
      const password = 'Password123!';
      const regResult = await authService.register(email, password);
      const refreshCookieName = process.env.JWT_REFRESH_COOKIE_NAME || 'refreshToken';
      
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
      
      // Delay to let asyncHandler complete its execution
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(res.cookie).toHaveBeenCalled();
    });
  });
});
