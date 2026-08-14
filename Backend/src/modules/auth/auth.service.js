import crypto from 'crypto';
import authRepository from './auth.repository.js';
import tokenService from './token.service.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../../utils/errors.js';
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

  /**
   * Update current user profile details.
   */
  async updateMe(userId, fullName) {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new BadRequestError('User not found');
    }

    if (fullName) {
      user.fullName = fullName;
    }

    await user.save();
    logger.info(`User profile updated: ${user.email}`, { userId: user._id });

    return {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
  }

  /**
   * Change password for currently authenticated user.
   */
  async updatePassword(userId, currentPassword, newPassword) {
    const user = await authRepository.findUserById(userId, true);
    if (!user) {
      throw new BadRequestError('User not found');
    }

    const isMatch = await verifyPassword(currentPassword, user.password);
    if (!isMatch) {
      throw new BadRequestError('Incorrect current password');
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    logger.info(`Password updated successfully for user ${user.email}`, { userId: user._id });
    
    // Revoke all refresh tokens for security
    await authRepository.revokeAllUserTokens(user._id);
  }

  /**
   * Request password reset token.
   */
  async forgotPassword(email) {
    const user = await authRepository.findUserByEmail(email);
    if (!user) {
      logger.info(`Password reset requested for non-existent email: ${email}`);
      throw new NotFoundError('User with this email does not exist');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await authRepository.updateUser(user._id, {
      passwordResetToken,
      passwordResetExpires
    });

    await enqueueEmail('sendPasswordReset', {
      toEmail: user.email,
      resetToken
    });

    logger.info(`Password reset link generated and enqueued for ${email}`, { userId: user._id });
  }

  /**
   * Reset password using a reset token.
   */
  async resetPassword(token, newPassword) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await authRepository.findUserByResetToken(hashedToken);
    if (!user) {
      throw new BadRequestError('Password reset token is invalid or has expired');
    }

    user.password = await hashPassword(newPassword);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    logger.info(`Password reset completed successfully for ${user.email}`, { userId: user._id });

    // Revoke all tokens
    await authRepository.revokeAllUserTokens(user._id);
  }

  /**
   * Complete Google OAuth handshake, find/create user, and generate tokens.
   */
  async handleGoogleCallback(code) {
    if (!code) {
      throw new BadRequestError('OAuth authorization code is required');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const callbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/google/callback';

    if (!clientId || !clientSecret) {
      logger.error('Google OAuth credentials are not configured in environment.');
      throw new BadRequestError('Google OAuth is not configured on this server');
    }

    try {
      // 1. Exchange code for access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: callbackUrl,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        logger.error('Google token exchange failed', { error: errorData });
        throw new BadRequestError(`Failed to exchange code with Google: ${errorData.error_description || errorData.error || JSON.stringify(errorData)}`);
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // 2. Fetch user profile information
      const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!userinfoResponse.ok) {
        logger.error('Google userinfo retrieval failed');
        throw new BadRequestError('Failed to retrieve user profile from Google');
      }

      const googleUser = await userinfoResponse.json();
      const { sub: googleId, email, name, picture: avatarUrl } = googleUser;

      if (!email) {
        throw new BadRequestError('Google account does not have an email address associated');
      }

      // 3. Find or create user
      let user = await authRepository.findUserByEmail(email);

      if (user) {
        // Link Google ID if not already linked
        let updated = false;
        if (!user.googleId) {
          user.googleId = googleId;
          updated = true;
        }
        if (!user.isVerified) {
          user.isVerified = true;
          updated = true;
        }
        if (avatarUrl && !user.avatarUrl) {
          user.avatarUrl = avatarUrl;
          updated = true;
        }
        if (updated) {
          await user.save();
        }
      } else {
        // Create user
        user = await authRepository.createUser({
          email,
          fullName: name || email.split('@')[0],
          avatarUrl,
          googleId,
          isVerified: true,
        });
      }

      if (!user.isActive) {
        throw new UnauthorizedError('User account is deactivated');
      }

      logger.info(`User logged in via Google OAuth: ${email}`, { userId: user._id });

      const tokens = await tokenService.generateAuthTokens(user);

      const userResponse = {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        isActive: user.isActive,
        isVerified: user.isVerified,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      };

      return { user: userResponse, tokens };
    } catch (error) {
      logger.error('Google OAuth error:', error);
      throw error;
    }
  }

  /**
   * Complete GitHub OAuth handshake, find/create user, and generate tokens.
   */
  async handleGithubCallback(code) {
    if (!code) {
      throw new BadRequestError('OAuth authorization code is required');
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const callbackUrl = process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/github/callback';

    if (!clientId || !clientSecret) {
      logger.error('GitHub OAuth credentials are not configured in environment.');
      throw new BadRequestError('GitHub OAuth is not configured on this server');
    }

    try {
      // 1. Exchange code for access token
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: callbackUrl,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        logger.error('GitHub token exchange failed', { errorText });
        throw new BadRequestError('Failed to exchange code with GitHub');
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      if (!accessToken) {
        logger.error('GitHub token response did not contain access token', tokenData);
        throw new BadRequestError('Failed to retrieve access token from GitHub');
      }

      // 2. Fetch user profile details
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'TaskFlow-Backend',
        },
      });

      if (!userResponse.ok) {
        logger.error('GitHub user profile retrieval failed');
        throw new BadRequestError('Failed to retrieve user profile from GitHub');
      }

      const githubUser = await userResponse.json();
      const { id: githubIdStr, name, login, avatar_url: avatarUrl } = githubUser;
      const githubId = String(githubIdStr);
      let email = githubUser.email;

      // 3. GitHub emails endpoint to get primary email (if profile email is null)
      if (!email) {
        const emailsResponse = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': 'TaskFlow-Backend',
          },
        });

        if (emailsResponse.ok) {
          const emails = await emailsResponse.json();
          logger.info('GitHub emails retrieved:', { count: emails?.length });
          // Find primary email
          const primaryEmailObj = emails.find(e => e.primary) || emails[0];
          if (primaryEmailObj) {
            email = primaryEmailObj.email;
          }
        } else {
          const errorText = await emailsResponse.text();
          logger.error('GitHub emails retrieval failed', { status: emailsResponse.status, errorText });
          throw new BadRequestError(`Failed to retrieve email list from GitHub (Status ${emailsResponse.status}): ${errorText}`);
        }
      }

      if (!email) {
        throw new BadRequestError('GitHub account does not have a primary email address associated');
      }

      // 4. Find or create user
      let user = await authRepository.findUserByEmail(email);

      if (user) {
        // Link GitHub ID if not already linked
        let updated = false;
        if (!user.githubId) {
          user.githubId = githubId;
          updated = true;
        }
        if (!user.isVerified) {
          user.isVerified = true;
          updated = true;
        }
        if (avatarUrl && !user.avatarUrl) {
          user.avatarUrl = avatarUrl;
          updated = true;
        }
        if (updated) {
          await user.save();
        }
      } else {
        // Create user
        user = await authRepository.createUser({
          email,
          fullName: name || login || email.split('@')[0],
          avatarUrl,
          githubId,
          isVerified: true,
        });
      }

      if (!user.isActive) {
        throw new UnauthorizedError('User account is deactivated');
      }

      logger.info(`User logged in via GitHub OAuth: ${email}`, { userId: user._id });

      const tokens = await tokenService.generateAuthTokens(user);

      const userResponseData = {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        isActive: user.isActive,
        isVerified: user.isVerified,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      };

      return { user: userResponseData, tokens };
    } catch (error) {
      logger.error('GitHub OAuth error:', error);
      throw error;
    }
  }
}

export default new AuthService();
