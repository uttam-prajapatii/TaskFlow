import { BadRequestError } from '../../utils/errors.js';

/**
 * Middleware to validate and sanitize workspace creation inputs.
 */
export const validateCreateWorkspace = (req, res, next) => {
const { name, description, settings } = req.body;

const error = validateName(name)
|| validateDescription(description)
|| validateSettings(settings);

if (error) return next(error);

// Sanitize
req.body.name = name.trim();
if (description !== undefined) {
req.body.description = description.trim();
}

next();
};

function validateName(name, isRequired = true) {
  if (name === undefined) {
    if (isRequired) {
      return new BadRequestError('Workspace name is required and must be a string');
    }
    return null;
  }

  if (typeof name !== 'string' || (isRequired && !name)) {
    return new BadRequestError(
      isRequired
        ? 'Workspace name is required and must be a string'
        : 'Workspace name must be a string'
    );
  }

  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 100) {
    return new BadRequestError('Workspace name must be between 1 and 100 characters');
  }

  return null;
}

function validateDescription(description) {
  if (description === undefined) return null;

  if (typeof description !== 'string') {
    return new BadRequestError('Description must be a string');
  }

  if (description.length > 500) {
    return new BadRequestError('Description must be at most 500 characters');
  }

  return null;
}

function validateSettings(settings) {
  if (settings === undefined) return null;

  if (typeof settings !== 'object' || settings === null) {
    return new BadRequestError('Settings must be an object');
  }

  const { allowViewerComments, defaultBoardVisibility } = settings;

  if (allowViewerComments !== undefined && typeof allowViewerComments !== 'boolean') {
    return new BadRequestError('allowViewerComments must be a boolean');
  }

  if (
    defaultBoardVisibility !== undefined &&
    (typeof defaultBoardVisibility !== 'string' ||
      !['workspace', 'private'].includes(defaultBoardVisibility))
  ) {
    return new BadRequestError("defaultBoardVisibility must be either 'workspace' or 'private'");
  }

  return null;
}


/**
 * Middleware to validate and sanitize workspace update inputs.
 */
export const validateUpdateWorkspace = (req, res, next) => {
  const { name, description, settings } = req.body;

  // If body is empty
  if (name === undefined && description === undefined && settings === undefined) {
    return next(new BadRequestError('At least one field (name, description, settings) must be provided for update'));
  }

  const error = (name !== undefined ? validateName(name, false) : null)
    || (description !== undefined ? validateDescription(description) : null)
    || (settings !== undefined ? validateSettings(settings) : null);

  if (error) return next(error);

  // Sanitize
  if (name !== undefined) {
    req.body.name = name.trim();
  }
  if (description !== undefined) {
    req.body.description = description.trim();
  }

  next();
};
