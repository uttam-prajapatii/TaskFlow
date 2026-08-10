import mongoose from 'mongoose';
import { BadRequestError } from '../../utils/errors.js';

export const validateNotificationId = (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new BadRequestError('Invalid notification ID format'));
  }
  next();
};

export const validateListNotifications = (req, res, next) => {
  const { page, limit, isRead } = req.query;

  if (page !== undefined) {
    const pageNum = parseInt(page, 10);
    if (Number.isNaN(pageNum) || pageNum <= 0) {
      return next(new BadRequestError('Page parameter must be a positive integer'));
    }
  }

  if (limit !== undefined) {
    const limitNum = parseInt(limit, 10);
    if (Number.isNaN(limitNum) || limitNum <= 0 || limitNum > 100) {
      return next(new BadRequestError('Limit parameter must be a positive integer (max 100)'));
    }
  }

  if (isRead !== undefined) {
    if (isRead !== 'true' && isRead !== 'false') {
      return next(new BadRequestError('isRead parameter must be true or false'));
    }
  }

  next();
};
