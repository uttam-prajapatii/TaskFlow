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
    
    // Set cookies for hybrid authentication
    setTokenCookies(res, result.tokens);

    return ApiResponse.created(res, 'User registered successfully', result);
  });

  /**
   * Log in an existing user.
   */
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    
    // Set cookies for hybrid authentication
    setTokenCookies(res, result.tokens);

    return ApiResponse.success(res, 'Logged in successfully', result);
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
}

export default new AuthController();
