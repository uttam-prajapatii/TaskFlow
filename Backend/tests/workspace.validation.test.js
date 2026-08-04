import { describe, test, expect } from 'bun:test';
import { validateCreateWorkspace, validateUpdateWorkspace } from '../src/modules/workspace/workspace.validation.js';
import { BadRequestError } from '../src/utils/errors.js';

describe('Workspace Validation Middleware', () => {
  const runMiddleware = (middleware, body) => {
    const req = { body };
    const res = {};
    let nextCalled = false;
    let errorPassed = undefined;
    const next = (err) => {
      nextCalled = true;
      errorPassed = err;
    };
    middleware(req, res, next);
    return { req, nextCalled, errorPassed };
  };

  describe('validateCreateWorkspace', () => {
    test('should pass with a valid name', () => {
      const { req, nextCalled, errorPassed } = runMiddleware(validateCreateWorkspace, {
        name: ' My Workspace '
      });
      expect(nextCalled).toBe(true);
      expect(errorPassed).toBeUndefined();
      expect(req.body.name).toBe('My Workspace');
    });

    test('should fail when name is missing', () => {
      const { nextCalled, errorPassed } = runMiddleware(validateCreateWorkspace, {
        description: 'No name'
      });
      expect(nextCalled).toBe(true);
      expect(errorPassed).toBeInstanceOf(BadRequestError);
      expect(errorPassed.message).toBe('Workspace name is required and must be a string');
    });

    test('should fail when name is not a string', () => {
      const { nextCalled, errorPassed } = runMiddleware(validateCreateWorkspace, {
        name: 123
      });
      expect(nextCalled).toBe(true);
      expect(errorPassed).toBeInstanceOf(BadRequestError);
      expect(errorPassed.message).toBe('Workspace name is required and must be a string');
    });

    test('should fail when name length is less than 1 character after trim', () => {
      const { nextCalled, errorPassed } = runMiddleware(validateCreateWorkspace, {
        name: '   '
      });
      expect(nextCalled).toBe(true);
      expect(errorPassed).toBeInstanceOf(BadRequestError);
      expect(errorPassed.message).toBe('Workspace name must be between 1 and 100 characters');
    });

    test('should fail when name length is more than 100 characters', () => {
      const { nextCalled, errorPassed } = runMiddleware(validateCreateWorkspace, {
        name: 'a'.repeat(101)
      });
      expect(nextCalled).toBe(true);
      expect(errorPassed).toBeInstanceOf(BadRequestError);
      expect(errorPassed.message).toBe('Workspace name must be between 1 and 100 characters');
    });

    test('should pass with valid description and sanitize it', () => {
      const { req, nextCalled, errorPassed } = runMiddleware(validateCreateWorkspace, {
        name: 'Workspace Name',
        description: '  Valid description  '
      });
      expect(nextCalled).toBe(true);
      expect(errorPassed).toBeUndefined();
      expect(req.body.description).toBe('Valid description');
    });

    test('should fail when description is not a string', () => {
      const { nextCalled, errorPassed } = runMiddleware(validateCreateWorkspace, {
        name: 'Workspace Name',
        description: 123
      });
      expect(nextCalled).toBe(true);
      expect(errorPassed).toBeInstanceOf(BadRequestError);
      expect(errorPassed.message).toBe('Description must be a string');
    });

    test('should fail when description is too long', () => {
      const { nextCalled, errorPassed } = runMiddleware(validateCreateWorkspace, {
        name: 'Workspace Name',
        description: 'a'.repeat(501)
      });
      expect(nextCalled).toBe(true);
      expect(errorPassed).toBeInstanceOf(BadRequestError);
      expect(errorPassed.message).toBe('Description must be at most 500 characters');
    });

    test('should pass with valid settings', () => {
      const { nextCalled, errorPassed } = runMiddleware(validateCreateWorkspace, {
        name: 'Workspace Name',
        settings: {
          allowViewerComments: true,
          defaultBoardVisibility: 'private'
        }
      });
      expect(nextCalled).toBe(true);
      expect(errorPassed).toBeUndefined();
    });

    test('should fail when settings is not an object', () => {
      const { nextCalled, errorPassed } = runMiddleware(validateCreateWorkspace, {
        name: 'Workspace Name',
        settings: 'invalid'
      });
      expect(nextCalled).toBe(true);
      expect(errorPassed).toBeInstanceOf(BadRequestError);
      expect(errorPassed.message).toBe('Settings must be an object');
    });

    test('should fail when allowViewerComments is not boolean', () => {
      const { nextCalled, errorPassed } = runMiddleware(validateCreateWorkspace, {
        name: 'Workspace Name',
        settings: {
          allowViewerComments: 'yes'
        }
      });
      expect(nextCalled).toBe(true);
      expect(errorPassed).toBeInstanceOf(BadRequestError);
      expect(errorPassed.message).toBe('allowViewerComments must be a boolean');
    });

    test('should fail when defaultBoardVisibility is invalid value', () => {
      const { nextCalled, errorPassed } = runMiddleware(validateCreateWorkspace, {
        name: 'Workspace Name',
        settings: {
          defaultBoardVisibility: 'public'
        }
      });
      expect(nextCalled).toBe(true);
      expect(errorPassed).toBeInstanceOf(BadRequestError);
      expect(errorPassed.message).toBe("defaultBoardVisibility must be either 'workspace' or 'private'");
    });
  });

  describe('validateUpdateWorkspace', () => {
    test('should fail when body is empty', () => {
      const { nextCalled, errorPassed } = runMiddleware(validateUpdateWorkspace, {});
      expect(nextCalled).toBe(true);
      expect(errorPassed).toBeInstanceOf(BadRequestError);
      expect(errorPassed.message).toBe('At least one field (name, description, settings) must be provided for update');
    });

    test('should pass and trim name if provided', () => {
      const { req, nextCalled, errorPassed } = runMiddleware(validateUpdateWorkspace, {
        name: ' Updated Name '
      });
      expect(nextCalled).toBe(true);
      expect(errorPassed).toBeUndefined();
      expect(req.body.name).toBe('Updated Name');
    });

    test('should fail when name is not a string', () => {
      const { nextCalled, errorPassed } = runMiddleware(validateUpdateWorkspace, {
        name: 123
      });
      expect(nextCalled).toBe(true);
      expect(errorPassed).toBeInstanceOf(BadRequestError);
      expect(errorPassed.message).toBe('Workspace name must be a string');
    });

    test('should fail when name is empty after trim', () => {
      const { nextCalled, errorPassed } = runMiddleware(validateUpdateWorkspace, {
        name: '   '
      });
      expect(nextCalled).toBe(true);
      expect(errorPassed).toBeInstanceOf(BadRequestError);
      expect(errorPassed.message).toBe('Workspace name must be between 1 and 100 characters');
    });

    test('should pass and trim description if provided', () => {
      const { req, nextCalled, errorPassed } = runMiddleware(validateUpdateWorkspace, {
        description: ' New Description '
      });
      expect(nextCalled).toBe(true);
      expect(errorPassed).toBeUndefined();
      expect(req.body.description).toBe('New Description');
    });

    test('should fail when description is not a string', () => {
      const { nextCalled, errorPassed } = runMiddleware(validateUpdateWorkspace, {
        description: {}
      });
      expect(nextCalled).toBe(true);
      expect(errorPassed).toBeInstanceOf(BadRequestError);
      expect(errorPassed.message).toBe('Description must be a string');
    });

    test('should pass and validate settings if provided', () => {
      const { nextCalled, errorPassed } = runMiddleware(validateUpdateWorkspace, {
        settings: {
          allowViewerComments: false
        }
      });
      expect(nextCalled).toBe(true);
      expect(errorPassed).toBeUndefined();
    });

    test('should fail when settings allowViewerComments is invalid', () => {
      const { nextCalled, errorPassed } = runMiddleware(validateUpdateWorkspace, {
        settings: {
          allowViewerComments: 1
        }
      });
      expect(nextCalled).toBe(true);
      expect(errorPassed).toBeInstanceOf(BadRequestError);
      expect(errorPassed.message).toBe('allowViewerComments must be a boolean');
    });
  });
});
