import { describe, test, expect, mock } from 'bun:test';
import asyncHandler from '../src/utils/asyncHandler.js';

describe('asyncHandler', () => {
  test('should return a function', () => {
    const handler = asyncHandler(async () => {});
    expect(typeof handler).toBe('function');
  });

  test('should call the passed function with req, res, and next', async () => {
    const req = {};
    const res = {};
    const next = mock(() => {});
    
    const originalHandler = mock(async (req, res, next) => {
      return 'success';
    });

    const wrappedHandler = asyncHandler(originalHandler);
    await wrappedHandler(req, res, next);

    expect(originalHandler).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  test('should catch rejected promises and pass them to next', async () => {
    const req = {};
    const res = {};
    const next = mock(() => {});
    const error = new Error('Test async error');

    const originalHandler = async () => {
      throw error;
    };

    const wrappedHandler = asyncHandler(originalHandler);
    await wrappedHandler(req, res, next);

    // Give it a microtask tick for the promise to resolve/reject
    await Promise.resolve();

    expect(next).toHaveBeenCalledWith(error);
  });

  test('should catch synchronous errors and pass them to next', async () => {
    const req = {};
    const res = {};
    const next = mock(() => {});
    const error = new Error('Test sync error');

    const originalHandler = () => {
      throw error;
    };

    const wrappedHandler = asyncHandler(originalHandler);
    wrappedHandler(req, res, next);

    // Give it a microtask tick
    await Promise.resolve();

    expect(next).toHaveBeenCalledWith(error);
  });
});
