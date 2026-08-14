import authService from './auth.service.js';
import ApiResponse from '../../utils/apiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { setTokenCookies, clearTokenCookies, getRefreshTokenFromRequest } from './auth.utils.js';
import logger from '../../utils/logger.js';


class AuthController {
  /**
   * Register a new user.
   */
  register = asyncHandler(async (req, res) => {
    const { email, password, fullName } = req.body;
    const result = await authService.register(email, password, fullName);
    
    // Set cookies only if tokens are returned directly (for future compatibility)
    if (result.tokens) {
      setTokenCookies(res, result.tokens);
    }

    return ApiResponse.created(res, 'User registered successfully. Please verify your email using the OTP sent.', result);
  });

  /**
   * Log in an existing user.
   */
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    
    // Set cookies only for verified users who receive tokens
    if (result.tokens) {
      setTokenCookies(res, result.tokens);
      return ApiResponse.success(res, 'Logged in successfully', result);
    }

    // Unverified users receive confirmation of resent OTP
    return ApiResponse.success(res, result.message || 'Verification OTP sent to your email', result);
  });

  /**
   * Refresh the access and refresh tokens.
   */
  refresh = asyncHandler(async (req, res) => {
    const refreshToken = getRefreshTokenFromRequest(req);
    const tokens = await authService.refresh(refreshToken);
    
    // Rotate cookies
    setTokenCookies(res, tokens);

    return ApiResponse.success(res, 'Tokens refreshed successfully', tokens);
  });

  /**
   * Log out and revoke the refresh token.
   */
  logout = asyncHandler(async (req, res) => {
    const refreshToken = getRefreshTokenFromRequest(req);
    await authService.logout(refreshToken);
    
    // Clear cookies
    clearTokenCookies(res);

    return ApiResponse.success(res, 'Logged out successfully', null);
  });

  /**
   * Get the current authenticated user details.
   */
  getMe = asyncHandler(async (req, res) => {
    // req.user was populated by protect middleware
    return ApiResponse.success(res, 'User details retrieved successfully', {
      user: req.user,
    });
  });

  /**
   * Verify user email via OTP.
   */
  verifyOtp = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    const result = await authService.verifyOtp(email, otp);

    setTokenCookies(res, result.tokens);

    return ApiResponse.success(res, 'Email verified and logged in successfully', result);
  });

  /**
   * Resend verification OTP to user's email.
   */
  resendOtp = asyncHandler(async (req, res) => {
    const { email } = req.body;
    await authService.resendOtp(email);

    return ApiResponse.success(res, 'Verification OTP sent successfully', null);
  });

  /**
   * Update profile of current user.
   */
  updateMe = asyncHandler(async (req, res) => {
    const { fullName } = req.body;
    const user = await authService.updateMe(req.user._id, fullName);
    return ApiResponse.success(res, 'Profile updated successfully', user);
  });

  /**
   * Change current user's password.
   */
  updatePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    await authService.updatePassword(req.user._id, currentPassword, newPassword);
    
    clearTokenCookies(res);
    return ApiResponse.success(res, 'Password changed successfully. Please log in again.', null);
  });

  /**
   * Initiate forgot password flow.
   */
  forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    await authService.forgotPassword(email);
    return ApiResponse.success(res, 'If that email is registered, we have sent a password reset link.', null);
  });

  /**
   * Reset password using token.
   */
  resetPassword = asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;
    await authService.resetPassword(token, newPassword);
    
    clearTokenCookies(res);
    return ApiResponse.success(res, 'Password reset successfully. Please log in with your new password.', null);
  });

  /**
   * Redirect to Google OAuth consent page.
   */
  googleAuth = asyncHandler(async (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const callbackUrl = process.env.GOOGLE_CALLBACK_URL || `${req.protocol}://${req.get('host')}/api/v1/auth/google/callback`;

    if (!clientId) {
      return res.redirect(`${process.env.APP_BASE_URL}/login?error=${encodeURIComponent('Google OAuth Client ID is not configured')}`);
    }

    const scope = encodeURIComponent('profile email');
    const redirectUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${scope}`;
    
    return res.redirect(redirectUrl);
  });

  /**
   * Handle Google OAuth callback.
   */
  googleAuthCallback = asyncHandler(async (req, res) => {
    const { code, error } = req.query;

    if (error) {
      logger.error('Google OAuth callback returned error:', error);
      return res.redirect(`${process.env.APP_BASE_URL}/login?error=${encodeURIComponent(error)}`);
    }

    try {
      const result = await authService.handleGoogleCallback(code);
      setTokenCookies(res, result.tokens);
      return res.redirect(`${process.env.APP_BASE_URL}/auth/callback?success=true`);
    } catch (err) {
      logger.error('Google callback handling failed:', err);
      return res.redirect(`${process.env.APP_BASE_URL}/login?error=${encodeURIComponent(err.message || 'Authentication failed')}`);
    }
  });

  /**
   * Redirect to GitHub OAuth consent page.
   */
  githubAuth = asyncHandler(async (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const callbackUrl = process.env.GITHUB_CALLBACK_URL || `${req.protocol}://${req.get('host')}/api/v1/auth/github/callback`;

    if (!clientId) {
      return res.redirect(`${process.env.APP_BASE_URL}/login?error=${encodeURIComponent('GitHub OAuth Client ID is not configured')}`);
    }

    const scope = encodeURIComponent('user:email');
    const redirectUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${scope}`;
    
    return res.redirect(redirectUrl);
  });

  /**
   * Handle GitHub OAuth callback.
   */
  githubAuthCallback = asyncHandler(async (req, res) => {
    const { code, error } = req.query;

    if (error) {
      logger.error('GitHub OAuth callback returned error:', error);
      return res.redirect(`${process.env.APP_BASE_URL}/login?error=${encodeURIComponent(error)}`);
    }

    try {
      const result = await authService.handleGithubCallback(code);
      setTokenCookies(res, result.tokens);
      return res.redirect(`${process.env.APP_BASE_URL}/auth/callback?success=true`);
    } catch (err) {
      logger.error('GitHub callback handling failed:', err);
      return res.redirect(`${process.env.APP_BASE_URL}/login?error=${encodeURIComponent(err.message || 'Authentication failed')}`);
    }
  });
}

export default new AuthController();
