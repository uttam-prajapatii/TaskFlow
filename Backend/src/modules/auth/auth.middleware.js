import tokenService from './token.service.js';
import authRepository from './auth.repository.js';
import { UnauthorizedError } from '../../utils/errors.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { getAccessTokenFromRequest } from './auth.utils.js';

/**
 * Protect middleware: Ensures the request contains a valid access token,
 * verifies it, and attaches the active user to `req.user`.
 */
export const protect = asyncHandler(async (req, res, next) => {
  // 1. Extract token from Authorization header (Bearer <token>) or from cookies
  const token = getAccessTokenFromRequest(req);

  if (!token) {
    throw new UnauthorizedError('Access token is missing');
  }

  // 2. Verify token
  const decoded = tokenService.verifyToken(token, process.env.JWT_ACCESS_SECRET);

  // 3. Find user and ensure they still exist and are active
  const user = await authRepository.findUserById(decoded.sub);
  if (!user) {
    throw new UnauthorizedError('The user belonging to this token no longer exists');
  }

  if (!user.isActive) {
    throw new UnauthorizedError('User account is deactivated');
  }

  // 4. Attach user to request context
  req.user = {
    _id: user._id,
    email: user.email,
    isActive: user.isActive,
  };

  next();
});
