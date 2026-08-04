import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/modules/auth/user.model.js';
import { Workspace } from '../src/modules/workspace/workspace.model.js';
import { Board } from '../src/modules/board/board.model.js';
import boardService from '../src/modules/board/board.service.js';
import { ForbiddenError, NotFoundError, BadRequestError } from '../src/utils/errors.js';

dotenv.config();

describe('Board Management Automated Tests', () => {
  let owner;
  let admin;
  let member;
  let viewer;
  let stranger;
  let workspace;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/taskflow_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Workspace.deleteMany({});
    await Board.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Workspace.deleteMany({});
    await Board.deleteMany({});

    // Create test users
    owner = await User.create({ email: 'owner@test.com', password: 'password123', fullName: 'Workspace Owner', isActive: true });
    admin = await User.create({ email: 'admin@test.com', password: 'password123', fullName: 'Workspace Admin', isActive: true });
    member = await User.create({ email: 'member@test.com', password: 'password123', fullName: 'Workspace Member', isActive: true });
    viewer = await User.create({ email: 'viewer@test.com', password: 'password123', fullName: 'Workspace Viewer', isActive: true });
    stranger = await User.create({ email: 'stranger@test.com', password: 'password123', fullName: 'Stranger', isActive: true });

    // Create test workspace
    workspace = await Workspace.create({
      name: 'Test Workspace',
      slug: 'test-workspace',
      ownerId: owner._id,
      members: [
        { userId: owner._id, role: 'admin' },
        { userId: admin._id, role: 'admin' },
        { userId: member._id, role: 'member' },
        { userId: viewer._id, role: 'viewer' }
      ]
    });
  });

  describe('Create Board', () => {
    test('should allow member to create a board', async () => {
      const board = await boardService.createBoard(workspace._id, member._id, {
        name: 'Sprint Planning',
        description: 'Plan current sprint',
        visibility: 'workspace'
      });

      expect(board).toBeDefined();
      expect(board.name).toBe('Sprint Planning');
      expect(board.workspaceId.toString()).toBe(workspace._id.toString());
      expect(board.createdBy.toString()).toBe(member._id.toString());
      expect(board.isArchived).toBe(false);
      expect(board.isDeleted).toBe(false);
    });

    test('should block viewer from creating a board', async () => {
      let error;
      try {
        await boardService.createBoard(workspace._id, viewer._id, {
          name: 'Viewer Board',
          visibility: 'workspace'
        });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenError);
    });

    test('should block stranger from creating a board', async () => {
      let error;
      try {
        await boardService.createBoard(workspace._id, stranger._id, {
          name: 'Stranger Board',
          visibility: 'workspace'
        });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenError);
    });

    test('should block duplicate board name within same workspace', async () => {
      await boardService.createBoard(workspace._id, member._id, { name: 'Sprint Planning' });
      let error;
      try {
        await boardService.createBoard(workspace._id, member._id, { name: 'Sprint Planning' });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(BadRequestError);
    });

    test('should block creating a board if workspace is archived', async () => {
      workspace.isArchived = true;
      await workspace.save();

      let error;
      try {
        await boardService.createBoard(workspace._id, member._id, { name: 'New Board' });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenError);
    });
  });

  describe('List Boards', () => {
    let boardWorkspace;
    let boardPrivate;

    beforeEach(async () => {
      boardWorkspace = await boardService.createBoard(workspace._id, member._id, {
        name: 'Workspace Board',
        visibility: 'workspace'
      });
      boardPrivate = await boardService.createBoard(workspace._id, member._id, {
        name: 'Private Board',
        visibility: 'private'
      });
    });

    test('should allow admin/owner to list all boards', async () => {
      const list = await boardService.listBoards(workspace._id, admin._id, {});
      expect(list.boards).toHaveLength(2);
    });

    test('should allow member (creator) to list all boards', async () => {
      const list = await boardService.listBoards(workspace._id, member._id, {});
      expect(list.boards).toHaveLength(2);
    });

    test('should only show workspace board to viewer (non-creator of private)', async () => {
      const list = await boardService.listBoards(workspace._id, viewer._id, {});
      expect(list.boards).toHaveLength(1);
      expect(list.boards[0].name).toBe('Workspace Board');
    });

    test('should block stranger from listing boards', async () => {
      let error;
      try {
        await boardService.listBoards(workspace._id, stranger._id, {});
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenError);
    });
  });

  describe('Get Board Details', () => {
    let boardWorkspace;
    let boardPrivate;

    beforeEach(async () => {
      boardWorkspace = await boardService.createBoard(workspace._id, member._id, {
        name: 'Workspace Board',
        visibility: 'workspace'
      });
      boardPrivate = await boardService.createBoard(workspace._id, member._id, {
        name: 'Private Board',
        visibility: 'private'
      });
    });

    test('should allow viewer to get details of workspace board', async () => {
      const details = await boardService.getBoardDetails(boardWorkspace._id, viewer._id);
      expect(details.name).toBe('Workspace Board');
    });

    test('should block viewer from getting details of private board', async () => {
      let error;
      try {
        await boardService.getBoardDetails(boardPrivate._id, viewer._id);
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenError);
    });

    test('should allow admin to get details of private board', async () => {
      const details = await boardService.getBoardDetails(boardPrivate._id, admin._id);
      expect(details.name).toBe('Private Board');
    });
  });

  describe('Update Board', () => {
    let board;

    beforeEach(async () => {
      board = await boardService.createBoard(workspace._id, member._id, {
        name: 'Sprint Planning',
        visibility: 'workspace'
      });
    });

    test('should allow creator to update board', async () => {
      const updated = await boardService.updateBoard(board._id, member._id, { name: 'Sprint Planning V2' });
      expect(updated.name).toBe('Sprint Planning V2');
    });

    test('should allow admin to update board', async () => {
      const updated = await boardService.updateBoard(board._id, admin._id, { name: 'Sprint Planning V2' });
      expect(updated.name).toBe('Sprint Planning V2');
    });

    test('should block viewer from updating board', async () => {
      let error;
      try {
        await boardService.updateBoard(board._id, viewer._id, { name: 'Hack Name' });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenError);
    });

    test('should block update to duplicate name in workspace', async () => {
      await boardService.createBoard(workspace._id, member._id, { name: 'Other Board' });
      let error;
      try {
        await boardService.updateBoard(board._id, member._id, { name: 'Other Board' });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(BadRequestError);
    });

    test('should block update if board is archived', async () => {
      await boardService.archiveBoard(board._id, admin._id);
      let error;
      try {
        await boardService.updateBoard(board._id, member._id, { name: 'New Name' });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(BadRequestError);
    });
  });

  describe('Archive / Restore / Delete', () => {
    let board;

    beforeEach(async () => {
      board = await boardService.createBoard(workspace._id, member._id, {
        name: 'Board to Modify',
        visibility: 'workspace'
      });
    });

    test('should allow admin to archive, and block member', async () => {
      let error;
      try {
        await boardService.archiveBoard(board._id, member._id);
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenError);

      const archived = await boardService.archiveBoard(board._id, admin._id);
      expect(archived.isArchived).toBe(true);
    });

    test('should allow admin to restore', async () => {
      await boardService.archiveBoard(board._id, admin._id);
      const restored = await boardService.restoreBoard(board._id, admin._id);
      expect(restored.isArchived).toBe(false);
    });

    test('should allow admin to soft delete, and block fetches', async () => {
      let error;
      try {
        await boardService.softDeleteBoard(board._id, member._id);
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenError);

      await boardService.softDeleteBoard(board._id, admin._id);

      let fetchError;
      try {
        await boardService.getBoardDetails(board._id, admin._id);
      } catch (err) {
        fetchError = err;
      }
      expect(fetchError).toBeDefined();
      expect(fetchError).toBeInstanceOf(NotFoundError);
    });
  });
});
