import authService from './auth.service.js';
import ApiResponse from '../../utils/apiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

class AuthController {
  /**
   * Register a new user.
   */
  /**
   * Helper to set access and refresh token cookies
   */
  setTokenCookies(res, tokens) {
    const isProduction = process.env.NODE_ENV === 'production';
    const accessCookieName = process.env.JWT_ACCESS_COOKIE_NAME || 'accessToken';
    const refreshCookieName = process.env.JWT_REFRESH_COOKIE_NAME || 'refreshToken';

    res.cookie(accessCookieName, tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 mins
    });

    res.cookie(refreshCookieName, tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  /**
   * Helper to clear auth cookies
   */
  clearTokenCookies(res) {
    const accessCookieName = process.env.JWT_ACCESS_COOKIE_NAME || 'accessToken';
    const refreshCookieName = process.env.JWT_REFRESH_COOKIE_NAME || 'refreshToken';

    res.clearCookie(accessCookieName);
    res.clearCookie(refreshCookieName);
  }

  /**
   * Register a new user.
   */
  register = asyncHandler(async (req, res) => {
    const { email, password, fullName } = req.body;
    const result = await authService.register(email, password, fullName);
    
    // Set cookies for hybrid authentication
    this.setTokenCookies(res, result.tokens);

    return ApiResponse.created(res, 'User registered successfully', result);
  });

  /**
   * Log in an existing user.
   */
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    
    // Set cookies for hybrid authentication
    this.setTokenCookies(res, result.tokens);

    return ApiResponse.success(res, 'Logged in successfully', result);
  });

  /**
   * Refresh the access and refresh tokens.
   */
  refresh = asyncHandler(async (req, res) => {
    const refreshCookieName = process.env.JWT_REFRESH_COOKIE_NAME || 'refreshToken';
    const refreshToken = req.body.refreshToken || (req?.cookies[refreshCookieName]);
    const tokens = await authService.refresh(refreshToken);
    
    // Rotate cookies
    this.setTokenCookies(res, tokens);

    return ApiResponse.success(res, 'Tokens refreshed successfully', tokens);
  });

  /**
   * Log out and revoke the refresh token.
   */
  logout = asyncHandler(async (req, res) => {
    const refreshCookieName = process.env.JWT_REFRESH_COOKIE_NAME || 'refreshToken';
    const refreshToken = req.body.refreshToken || (req?.cookies[refreshCookieName]);
    await authService.logout(refreshToken);
    
    // Clear cookies
    this.clearTokenCookies(res);

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
