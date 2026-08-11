import mongoose from 'mongoose';
import { BadRequestError } from '../../utils/errors.js';

export const validateTaskIdParam = (req, res, next) => {
  const { taskId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    return next(new BadRequestError('Invalid task ID format'));
  }
  next();
};

export const validateCommentIdParam = (req, res, next) => {
  const { commentId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    return next(new BadRequestError('Invalid comment ID format'));
  }
  next();
};

export const validateCreateComment = (req, res, next) => {
  const { body, mentions } = req.body;

  if (body === undefined) {
    return next(new BadRequestError('Comment body is required'));
  }

  if (typeof body !== 'string' || !body.trim()) {
    return next(new BadRequestError('Comment body must be a non-empty string'));
  }

  if (body.trim().length > 2000) {
    return next(new BadRequestError('Comment body must be at most 2000 characters'));
  }

  req.body.body = body.trim();

  if (mentions !== undefined) {
    if (!Array.isArray(mentions)) {
      return next(new BadRequestError('Mentions must be an array of user IDs'));
    }

    for (const userId of mentions) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return next(new BadRequestError(`Invalid mention user ID format: ${userId}`));
      }
    }
  }

  next();
};
