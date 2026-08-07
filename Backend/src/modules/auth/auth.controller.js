import authService from './auth.service.js';
import ApiResponse from '../../utils/apiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { setTokenCookies, clearTokenCookies, getRefreshTokenFromRequest } from './auth.utils.js';

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
}

export default new AuthController();
