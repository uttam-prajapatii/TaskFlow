import mongoose from 'mongoose';
import { BadRequestError } from '../../utils/errors.js';

export const validateLabelId = (req, res, next) => {
  const { labelId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(labelId)) {
    return next(new BadRequestError('Invalid label ID format'));
  }
  next();
};

export const validateCreateLabel = (req, res, next) => {
  const { name, color } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new BadRequestError('Label name is required and must be a non-empty string'));
  }
  if (name.trim().length > 50) {
    return next(new BadRequestError('Label name must be at most 50 characters'));
  }
  req.body.name = name.trim();

  if (color !== undefined) {
    const hexPattern = /^#([0-9a-fA-F]{3}){1,2}$/;
    if (!hexPattern.test(color)) {
      return next(new BadRequestError('Invalid color hex code format'));
    }
  }

  next();
};

export const validateUpdateLabel = (req, res, next) => {
  const { name, color } = req.body;

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return next(new BadRequestError('Label name must be a non-empty string'));
    }
    if (name.trim().length > 50) {
      return next(new BadRequestError('Label name must be at most 50 characters'));
    }
    req.body.name = name.trim();
  }

  if (color !== undefined) {
    const hexPattern = /^#([0-9a-fA-F]{3}){1,2}$/;
    if (!hexPattern.test(color)) {
      return next(new BadRequestError('Invalid color hex code format'));
    }
  }

  next();
};
