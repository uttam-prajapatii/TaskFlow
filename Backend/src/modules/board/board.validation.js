import { BadRequestError } from '../../utils/errors.js';

/**
 * Middleware to validate and sanitize board creation inputs.
 */
export const validateCreateBoard = (req, res, next) => {
  const { name, description, visibility } = req.body;

  const error = validateName(name, true)
    || validateDescription(description)
    || validateVisibility(visibility);

  if (error) return next(error);

  // Sanitize input
  req.body.name = name.trim();
  if (description !== undefined) {
    req.body.description = description.trim();
  }
  if (visibility !== undefined) {
    req.body.visibility = visibility.trim();
  }

  next();
};

/**
 * Middleware to validate and sanitize board update inputs.
 */
export const validateUpdateBoard = (req, res, next) => {
  const { name, description, visibility } = req.body;

  if (name === undefined && description === undefined && visibility === undefined) {
    return next(new BadRequestError('At least one field (name, description, or visibility) must be provided for update'));
  }

  const error = validateName(name, false)
    || validateDescription(description)
    || validateVisibility(visibility);

  if (error) return next(error);

  // Sanitize input
  if (name !== undefined) {
    req.body.name = name.trim();
  }
  if (description !== undefined) {
    req.body.description = description.trim();
  }
  if (visibility !== undefined) {
    req.body.visibility = visibility.trim();
  }

  next();
};

function validateName(name, isRequired = true) {
  if (name === undefined) {
    if (isRequired) {
      return new BadRequestError('Board name is required');
    }
    return null;
  }

  if (typeof name !== 'string' || (isRequired && !name.trim())) {
    return new BadRequestError('Board name must be a non-empty string');
  }

  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 100) {
    return new BadRequestError('Board name must be between 1 and 100 characters');
  }

  return null;
}

function validateDescription(description) {
  if (description === undefined) return null;

  if (typeof description !== 'string') {
    return new BadRequestError('Description must be a string');
  }

  if (description.length > 300) {
    return new BadRequestError('Description must be at most 300 characters');
  }

  return null;
}

function validateVisibility(visibility) {
  if (visibility === undefined) return null;

  if (typeof visibility !== 'string') {
    return new BadRequestError('Visibility must be a string');
  }

  const trimmed = visibility.trim();
  if (!['workspace', 'private'].includes(trimmed)) {
    return new BadRequestError("Visibility must be either 'workspace' or 'private'");
  }

  return null;
}
