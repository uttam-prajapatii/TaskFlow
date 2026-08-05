/**
 * Convert relative time string (e.g., "15m", "7d", "1h", "30s") into milliseconds.
 * Supported units: s (seconds), m (minutes), h (hours), d (days), y (years).
 * @param {string} timeStr 
 * @returns {number}
 */
export const parseTimeToMs = (timeStr) => {
  if (!timeStr) return 0;
  
  const regex = /^(\d+)([smdhy])$/;
  const match = String(timeStr).trim().match(regex);
  if (!match) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'y':
      return value * 365 * 24 * 60 * 60 * 1000;
    default:
      return 0;
  }
};

/**
 * Get cookie config options from environment variables.
 */
export const getCookieOptions = (type) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const httpOnly = process.env.JWT_COOKIE_HTTP_ONLY === 'false' ? false : true;
  
  // Use env value if defined, otherwise default to isProduction check
  let secure = isProduction;
  if (process.env.JWT_COOKIE_SECURE !== undefined) {
    secure = process.env.JWT_COOKIE_SECURE === 'true';
  }

  const sameSite = process.env.JWT_COOKIE_SAME_SITE || 'lax';

  let maxAge;
  if (type === 'access') {
    const rawMaxAge = process.env.JWT_ACCESS_COOKIE_MAX_AGE || '15m';
    maxAge = parseTimeToMs(rawMaxAge);
  } else {
    const rawMaxAge = process.env.JWT_REFRESH_COOKIE_MAX_AGE || '7d';
    maxAge = parseTimeToMs(rawMaxAge);
  }

  return {
    httpOnly,
    secure,
    sameSite,
    maxAge,
  };
};

export const cookieConfig = {
  get accessToken() {
    return {
      name: process.env.JWT_ACCESS_COOKIE_NAME || 'accessToken',
      options: getCookieOptions('access'),
    };
  },
  get refreshToken() {
    return {
      name: process.env.JWT_REFRESH_COOKIE_NAME || 'refreshToken',
      options: getCookieOptions('refresh'),
    };
  }
};

/**
 * Set access and refresh token cookies on the response
 * @param {Response} res 
 * @param {Object} tokens 
 * @param {string} tokens.accessToken 
 * @param {string} tokens.refreshToken 
 */
export const setTokenCookies = (res, tokens) => {
  res.cookie(cookieConfig.accessToken.name, tokens.accessToken, cookieConfig.accessToken.options);
  res.cookie(cookieConfig.refreshToken.name, tokens.refreshToken, cookieConfig.refreshToken.options);
};

/**
 * Clear access and refresh token cookies from the response
 * @param {Response} res 
 */
export const clearTokenCookies = (res) => {
  res.clearCookie(cookieConfig.accessToken.name);
  res.clearCookie(cookieConfig.refreshToken.name);
};

/**
 * Extract the access token from Authorization header or cookies
 * @param {Request} req 
 * @returns {string|null}
 */
export const getAccessTokenFromRequest = (req) => {
  if (req.headers.authorization?.startsWith('Bearer')) {
    return req.headers.authorization.split(' ')[1];
  }
  if (req.cookies?.[cookieConfig.accessToken.name]) {
    return req.cookies[cookieConfig.accessToken.name];
  }
  return null;
};

/**
 * Extract the refresh token from body or cookies
 * @param {Request} req 
 * @returns {string|null}
 */
export const getRefreshTokenFromRequest = (req) => {
  return req.body?.refreshToken || req.cookies?.[cookieConfig.refreshToken.name] || null;
};
