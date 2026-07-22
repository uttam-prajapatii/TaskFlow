import User from './user.model.js';
import RefreshToken from './refreshToken.model.js';

class AuthRepository {
  // ==========================================
  // User Operations
  // ==========================================

  /**
   * Create a new user in the database.
   */
  async createUser(userData) {
    return User.create(userData);
  }

  /**
   * Find a user by email address.
   */
  async findUserByEmail(email, includePassword = false) {
    const query = User.findOne({ email });
    if (includePassword) {
      query.select('+password');
    }
    return query.exec();
  }

  /**
   * Find a user by their ID.
   */
  async findUserById(userId) {
    return User.findById(userId).exec();
  }

  // ==========================================
  // Refresh Token Operations
  // ==========================================

  /**
   * Store a new refresh token record.
   */
  async createRefreshToken(tokenData) {
    return RefreshToken.create(tokenData);
  }

  /**
   * Find a refresh token record by its token hash.
   */
  async findRefreshTokenByHash(tokenHash) {
    return RefreshToken.findOne({ tokenHash }).exec();
  }

  /**
   * Atomically find and update a refresh token record.
   * Useful for race-condition-safe revocation during rotation.
   */
  async findOneAndUpdateRefreshToken(query, update) {
    return RefreshToken.findOneAndUpdate(query, update, { new: false }).exec();
  }

  /**
   * Revoke a refresh token by its JTI (JWT ID).
   */
  async revokeRefreshTokenByJti(jti) {
    return RefreshToken.updateOne(
      { jti },
      { isRevoked: true, revokedAt: new Date() }
    ).exec();
  }

  /**
   * Revoke all refresh tokens belonging to a user (e.g. on compromise or logout-all).
   */
  async revokeAllUserTokens(userId) {
    return RefreshToken.updateMany(
      { userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() }
    ).exec();
  }
}

export default new AuthRepository();
