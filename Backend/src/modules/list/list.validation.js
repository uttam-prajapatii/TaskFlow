import { BadRequestError } from '../../utils/errors.js';

/**
 * Middleware to validate and sanitize list creation inputs.
 */
export const validateCreateList = (req, res, next) => {
  const { name } = req.body;

  const error = validateName(name);
  if (error) return next(error);

  req.body.name = name.trim();
  next();
};

/**
 * Middleware to validate and sanitize list renaming inputs.
 */
export const validateRenameList = (req, res, next) => {
  const { name } = req.body;

  const error = validateName(name);
  if (error) return next(error);

  req.body.name = name.trim();
  next();
};

/**
 * Middleware to validate list reordering position.
 */
export const validateReorderList = (req, res, next) => {
  const { position } = req.body;

  if (position === undefined) {
    return next(new BadRequestError('Position is required'));
  }

  if (typeof position !== 'number' || !Number.isInteger(position) || position < 0) {
    return next(new BadRequestError('Position must be a non-negative integer'));
  }

  next();
};

function validateName(name) {
  if (name === undefined) {
    return new BadRequestError('List name is required');
  }

  if (typeof name !== 'string' || !name.trim()) {
    return new BadRequestError('List name must be a non-empty string');
  }

  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 60) {
    return new BadRequestError('List name must be between 1 and 60 characters');
  }

  return null;
}
