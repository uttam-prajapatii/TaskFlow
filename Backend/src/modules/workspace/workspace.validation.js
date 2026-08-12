import { BadRequestError } from '../../utils/errors.js';

/**
 * Middleware to validate and sanitize workspace creation inputs.
 */
export const validateCreateWorkspace = (req, res, next) => {
  const { name, description, settings, accentColor } = req.body;

  const error = validateName(name)
    || validateDescription(description)
    || validateSettings(settings)
    || validateAccentColor(accentColor);

  if (error) return next(error);

  // Sanitize
  req.body.name = name.trim();
  if (description !== undefined) {
    req.body.description = description.trim();
  }
  if (accentColor !== undefined) {
    req.body.accentColor = accentColor.trim();
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

  const { allowViewerComments, defaultBoardVisibility, inviteExpiryDays } = settings;

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

  if (inviteExpiryDays !== undefined && (typeof inviteExpiryDays !== 'number' || inviteExpiryDays <= 0)) {
    return new BadRequestError('inviteExpiryDays must be a positive number');
  }

  return null;
}

function validateAccentColor(accentColor) {
  if (accentColor === undefined) return null;

  if (typeof accentColor !== 'string') {
    return new BadRequestError('Accent color must be a string');
  }

  const hexRegex = /^#([0-9a-fA-F]{3}){1,2}$/;
  if (!hexRegex.test(accentColor.trim())) {
    return new BadRequestError('Accent color must be a valid hex color code (e.g. #4F46E5)');
  }

  return null;
}


/**
 * Middleware to validate and sanitize workspace update inputs.
 */
export const validateUpdateWorkspace = (req, res, next) => {
  const { name, description, settings, accentColor } = req.body;

  // If body is empty
  if (name === undefined && description === undefined && settings === undefined && accentColor === undefined) {
    return next(new BadRequestError('At least one field (name, description, settings, accentColor) must be provided for update'));
  }

  const error = (name !== undefined ? validateName(name, false) : null)
    || (description !== undefined ? validateDescription(description) : null)
    || (settings !== undefined ? validateSettings(settings) : null)
    || (accentColor !== undefined ? validateAccentColor(accentColor) : null);

  if (error) return next(error);

  // Sanitize
  if (name !== undefined) {
    req.body.name = name.trim();
  }
  if (description !== undefined) {
    req.body.description = description.trim();
  }
  if (accentColor !== undefined) {
    req.body.accentColor = accentColor.trim();
  }

  next();
};

/**
 * Middleware to validate inputs when inviting a new member.
 */
export const validateInviteMember = (req, res, next) => {
  const { email, role, inviteExpiryDays } = req.body;

  if (!email || typeof email !== 'string') {
    return next(new BadRequestError('Valid email is required'));
  }

  const emailRegex = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
  if (!emailRegex.test(email.trim())) {
    return next(new BadRequestError('Invalid email format'));
  }

  if (role !== undefined) {
    if (typeof role !== 'string' || !['admin', 'member', 'viewer'].includes(role)) {
      return next(new BadRequestError("Role must be 'admin', 'member', or 'viewer'"));
    }
  }

  if (inviteExpiryDays !== undefined) {
    if (typeof inviteExpiryDays !== 'number' || inviteExpiryDays <= 0) {
      return next(new BadRequestError('inviteExpiryDays must be a positive number'));
    }
  }

  req.body.email = email.trim().toLowerCase();
  next();
};

/**
 * Middleware to validate inputs when changing a member's role.
 */
export const validateChangeRole = (req, res, next) => {
  const { role } = req.body;

  if (!role || typeof role !== 'string' || !['admin', 'member', 'viewer'].includes(role)) {
    return next(new BadRequestError("Valid role is required ('admin', 'member', or 'viewer')"));
  }

  next();
};
