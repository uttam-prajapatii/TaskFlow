import bcrypt from 'bcryptjs';

/**
 * Hash a password using bcryptjs.
 * 
 * @param {string} password - The plain-text password to hash
 * @returns {Promise<string>} The hashed password
 */
export const hashPassword = async (password) => {
  const rounds = process.env.NODE_ENV === 'test' ? 1 : 12;
  const salt = await bcrypt.genSalt(rounds);
  return bcrypt.hash(password, salt);
};

/**
 * Verify a plain-text password against a hashed password.
 * 
 * @param {string} password - The plain-text password
 * @param {string} hashedPassword - The hashed password to verify against
 * @returns {Promise<boolean>} True if the password matches, false otherwise
 */
export const verifyPassword = async (password, hashedPassword) => {
  if (!password || !hashedPassword || typeof password !== 'string' || typeof hashedPassword !== 'string') {
    return false;
  }
  return bcrypt.compare(password, hashedPassword);
};
