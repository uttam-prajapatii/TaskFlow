import mongoose from 'mongoose';
import { BadRequestError } from '../../utils/errors.js';

export const validateTaskId = (req, res, next) => {
  const { taskId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    return next(new BadRequestError('Invalid task ID format'));
  }
  next();
};

export const validateListIdParam = (req, res, next) => {
  const { listId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(listId)) {
    return next(new BadRequestError('Invalid list ID format'));
  }
  next();
};

export const validateBoardIdParam = (req, res, next) => {
  const { boardId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(boardId)) {
    return next(new BadRequestError('Invalid board ID format'));
  }
  next();
};

export const validateUserIdParam = (req, res, next) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return next(new BadRequestError('Invalid user ID format'));
  }
  next();
};

export const validateCreateTask = (req, res, next) => {
  const { title, description, priority, dueDate } = req.body;

  if (title === undefined) {
    return next(new BadRequestError('Task title is required'));
  }
  if (typeof title !== 'string' || !title.trim()) {
    return next(new BadRequestError('Task title must be a non-empty string'));
  }
  if (title.trim().length > 150) {
    return next(new BadRequestError('Task title must be at most 150 characters'));
  }
  req.body.title = title.trim();

  if (description !== undefined) {
    if (typeof description !== 'string') {
      return next(new BadRequestError('Description must be a string'));
    }
    if (description.length > 5000) {
      return next(new BadRequestError('Description must be at most 5000 characters'));
    }
  }

  if (priority !== undefined) {
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return next(new BadRequestError(`Priority must be one of: ${validPriorities.join(', ')}`));
    }
  }

  if (dueDate !== undefined && dueDate !== null) {
    const parsedDate = new Date(dueDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return next(new BadRequestError('Invalid due date format'));
    }
    req.body.dueDate = parsedDate;
  }

  next();
};

export const validateUpdateTask = (req, res, next) => {
  const { title, description, priority, dueDate } = req.body;

  if (title !== undefined) {
    if (typeof title !== 'string' || !title.trim()) {
      return next(new BadRequestError('Task title must be a non-empty string'));
    }
    if (title.trim().length > 150) {
      return next(new BadRequestError('Task title must be at most 150 characters'));
    }
    req.body.title = title.trim();
  }

  if (description !== undefined) {
    if (typeof description !== 'string') {
      return next(new BadRequestError('Description must be a string'));
    }
    if (description.length > 5000) {
      return next(new BadRequestError('Description must be at most 5000 characters'));
    }
  }

  if (priority !== undefined) {
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return next(new BadRequestError(`Priority must be one of: ${validPriorities.join(', ')}`));
    }
  }

  if (dueDate !== undefined && dueDate !== null) {
    const parsedDate = new Date(dueDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return next(new BadRequestError('Invalid due date format'));
    }
    req.body.dueDate = parsedDate;
  }

  next();
};

export const validateMoveTask = (req, res, next) => {
  const { listId, position } = req.body;

  if (listId !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(listId)) {
      return next(new BadRequestError('Invalid list ID format'));
    }
  }

  if (position === undefined) {
    return next(new BadRequestError('Position is required'));
  }
  if (typeof position !== 'number' || !Number.isInteger(position) || position < 0) {
    return next(new BadRequestError('Position must be a non-negative integer'));
  }

  next();
};

export const validateChecklistOperation = (req, res, next) => {
  const { action, text, itemId, isDone } = req.body;

  const validActions = ['add', 'update', 'remove'];
  if (!action || !validActions.includes(action)) {
    return next(new BadRequestError('Action is required and must be one of: add, update, remove'));
  }

  if (action === 'add') {
    if (text === undefined || typeof text !== 'string' || !text.trim()) {
      return next(new BadRequestError('Text is required and must be a non-empty string for add action'));
    }
    if (text.trim().length > 150) {
      return next(new BadRequestError('Checklist item text must be at most 150 characters'));
    }
    req.body.text = text.trim();
  }

  if (action === 'update') {
    if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
      return next(new BadRequestError('Valid itemId is required for update action'));
    }
    if (text !== undefined) {
      if (typeof text !== 'string' || !text.trim()) {
        return next(new BadRequestError('Text must be a non-empty string if provided'));
      }
      if (text.trim().length > 150) {
        return next(new BadRequestError('Checklist item text must be at most 150 characters'));
      }
      req.body.text = text.trim();
    }
    if (isDone !== undefined && typeof isDone !== 'boolean') {
      return next(new BadRequestError('isDone must be a boolean value'));
    }
  }

  if (action === 'remove') {
    if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
      return next(new BadRequestError('Valid itemId is required for remove action'));
    }
  }

  next();
};

export const validateAddAssignee = (req, res, next) => {
  const { userId } = req.body;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return next(new BadRequestError('Valid userId is required'));
  }
  next();
};
