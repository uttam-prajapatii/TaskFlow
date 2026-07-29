import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import authRepository from './auth.repository.js';
import { UnauthorizedError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

class TokenService {
  /**
   * Helper to hash a refresh token using SHA-256.
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Parse relative time strings (like "15m", "7d") into a JavaScript Date object.
   */
  getExpiryDate(expiryStr) {
    const regex = /^(\d+)([smhd])$/;
    const match = expiryStr.match(regex);
    if (!match) {
      throw new Error(`Invalid expiry format: ${expiryStr}`);
    }

    const value = Number.parseInt(match[1], 10);
    const unit = match[2];
    let ms = 0;

    switch (unit) {
      case 's':
        ms = value * 1000;
        break;
      case 'm':
        ms = value * 60 * 1000;
        break;
      case 'h':
        ms = value * 60 * 60 * 1000;
        break;
      case 'd':
        ms = value * 24 * 60 * 60 * 1000;
        break;
    }

    return new Date(Date.now() + ms);
  }

  /**
   * Generate a generic JWT.
   */
  generateToken(payload, secret, expiresIn) {
    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Verify a generic JWT.
   */
  verifyToken(token, secret) {
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token has expired');
      }
      throw new UnauthorizedError('Invalid token');
    }
  }

  /**
   * Generate an Access + Refresh Token pair and persist the refresh token.
   */
  async generateAuthTokens(user) {
    const accessJti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();

    const accessExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    const refreshExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';

    const accessToken = this.generateToken(
      { sub: user._id, jti: accessJti, email: user.email },
      process.env.JWT_ACCESS_SECRET,
      accessExpiry
    );

    const refreshToken = this.generateToken(
      { sub: user._id, jti: refreshJti },
      process.env.JWT_REFRESH_SECRET,
      refreshExpiry
    );

    // Save refresh token hash in DB
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = this.getExpiryDate(refreshExpiry);

    await authRepository.createRefreshToken({
      userId: user._id,
      tokenHash,
      jti: refreshJti,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Rotate a refresh token: revoke the old one, verify, check reuse/concurrency, and issue new pair.
   */
  async rotateRefreshToken(oldRawToken) {
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    
    // 1. Verify token structure/expiry
    const decoded = this.verifyToken(oldRawToken, refreshSecret);
    const userId = decoded.sub;
    const tokenHash = this.hashToken(oldRawToken);

    // 2. Perform atomic lookup-and-revoke
    const oldTokenRecord = await authRepository.findOneAndUpdateRefreshToken(
      { tokenHash, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() }
    );

    // 3. Reuse/compromise detection or race condition handling
    if (!oldTokenRecord) {
      // Find the token regardless of status to understand why it failed
      const existingToken = await authRepository.findRefreshTokenByHash(tokenHash);

      if (!existingToken) {
        logger.warn(`Failed token rotation: token hash ${tokenHash} not found in database.`);
        throw new UnauthorizedError('Invalid refresh token');
      }

      if (existingToken.isRevoked) {
        // Concurrency / Race Condition check:
        // If it was revoked less than 2 seconds ago, it is likely a client-side concurrent request.
        const revokedAtTime = new Date(existingToken.revokedAt).getTime();
        const isRaceCondition = Date.now() - revokedAtTime < 2000;

        if (isRaceCondition) {
          logger.warn(`Race condition: concurrent refresh request caught for token hash: ${tokenHash}`);
          throw new UnauthorizedError('Token is rotating, please retry');
        }

        // True compromise: old token is reused outside the race condition window.
        // Revoke ALL sessions for this user.
        logger.error(
          `SECURITY BREACH: Hacked refresh token reuse detected! Token hash: ${tokenHash}. Revoking all sessions for user: ${userId}`
        );
        await authRepository.revokeAllUserTokens(userId);
        throw new UnauthorizedError(
          'Refresh token reuse detected. All sessions revoked. Please log in again.'
        );
      }
    }

    // 4. Ensure user is still active
    const user = await authRepository.findUserById(userId);
    if (!user || !user.isActive) {
      logger.warn(`Failed token rotation: user ${userId} does not exist or is inactive.`);
      throw new UnauthorizedError('User account is inactive or does not exist');
    }

    logger.info(`Refresh token rotated successfully for user: ${userId}`);

    // 5. Generate and return new pair
    return this.generateAuthTokens(user);
  }

  /**
   * Revoke a single refresh token record by its raw value.
   */
  async revokeRefreshToken(rawToken) {
    const tokenHash = this.hashToken(rawToken);
    logger.info(`Revoking refresh token hash: ${tokenHash}`);
    return authRepository.findOneAndUpdateRefreshToken(
      { tokenHash, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() }
    );
  }
}

export default new TokenService();
