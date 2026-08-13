import { describe, test, expect, mock } from 'bun:test';
import { validateCreateTask, validateUpdateTask } from '../src/modules/task/task.validation.js';
import { BadRequestError } from '../src/utils/errors.js';

describe('Task Validation Middleware Tests', () => {
  test('should allow valid due dates including today', () => {
    const today = new Date();
    const todayStr = today.toISOString();

    const req = {
      body: {
        title: 'Valid Task',
        dueDate: todayStr
      }
    };
    const res = {};
    const next = mock((err) => {
      expect(err).toBeUndefined();
    });

    validateCreateTask(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('should reject past due dates (e.g. yesterday)', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString();

    const req = {
      body: {
        title: 'Invalid Task',
        dueDate: yesterdayStr
      }
    };
    const res = {};
    let error;
    const next = mock((err) => {
      error = err;
    });

    validateCreateTask(req, res, next);
    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(BadRequestError);
    expect(error.message).toBe('Invalid due date format');
  });

  test('should allow tomorrow as a valid due date for update', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString();

    const req = {
      body: {
        dueDate: tomorrowStr
      }
    };
    const res = {};
    const next = mock((err) => {
      expect(err).toBeUndefined();
    });

    validateUpdateTask(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
