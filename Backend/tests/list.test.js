import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/modules/auth/user.model.js';
import { Workspace } from '../src/modules/workspace/workspace.model.js';
import { Board } from '../src/modules/board/board.model.js';
import { List } from '../src/modules/list/list.model.js';
import { Task } from '../src/modules/task/task.model.js';
import listService from '../src/modules/list/list.service.js';
import { ForbiddenError, NotFoundError, BadRequestError } from '../src/utils/errors.js';

dotenv.config();

describe('List Management Automated Tests', () => {
  let owner;
  let admin;
  let member;
  let viewer;
  let stranger;
  let workspace;
  let board;

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
    await List.deleteMany({});
    await Task.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Workspace.deleteMany({});
    await Board.deleteMany({});
    await List.deleteMany({});
    await Task.deleteMany({});

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

    // Create test board
    board = await Board.create({
      name: 'Test Board',
      workspaceId: workspace._id,
      createdBy: member._id,
      visibility: 'workspace'
    });
  });

  describe('Create List', () => {
    test('should allow member to create a list with auto-positioning', async () => {
      const listA = await listService.createList(board._id, member._id, { name: 'To Do' });
      expect(listA).toBeDefined();
      expect(listA.name).toBe('To Do');
      expect(listA.position).toBe(0);

      const listB = await listService.createList(board._id, member._id, { name: 'In Progress' });
      expect(listB.position).toBe(1);

      // Verify board listOrder matches
      const updatedBoard = await Board.findById(board._id);
      expect(updatedBoard.listOrder).toHaveLength(2);
      expect(updatedBoard.listOrder[0].toString()).toBe(listA._id.toString());
      expect(updatedBoard.listOrder[1].toString()).toBe(listB._id.toString());
    });

    test('should block viewer from creating a list', async () => {
      let error;
      try {
        await listService.createList(board._id, viewer._id, { name: 'Viewer List' });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenError);
    });

    test('should block duplicate list names on same board', async () => {
      await listService.createList(board._id, member._id, { name: 'To Do' });
      let error;
      try {
        await listService.createList(board._id, member._id, { name: 'To Do' });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(BadRequestError);
    });

    test('should block creating list if board or workspace is archived', async () => {
      board.isArchived = true;
      await board.save();

      let error;
      try {
        await listService.createList(board._id, member._id, { name: 'New List' });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenError);
    });
  });

  describe('Get Lists', () => {
    beforeEach(async () => {
      await listService.createList(board._id, member._id, { name: 'To Do' });
      await listService.createList(board._id, member._id, { name: 'In Progress' });
    });

    test('should allow viewer to get lists sorted by position', async () => {
      const listResult = await listService.getLists(board._id, viewer._id);
      expect(listResult).toHaveLength(2);
      expect(listResult[0].position).toBe(0);
      expect(listResult[1].position).toBe(1);
    });

    test('should block stranger from getting lists', async () => {
      let error;
      try {
        await listService.getLists(board._id, stranger._id);
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenError);
    });
  });

  describe('Rename List', () => {
    let list;

    beforeEach(async () => {
      list = await listService.createList(board._id, member._id, { name: 'To Do' });
    });

    test('should allow member to rename a list', async () => {
      const renamed = await listService.renameList(list._id, member._id, 'Tasks To Do');
      expect(renamed.name).toBe('Tasks To Do');
    });

    test('should block duplicate name on rename', async () => {
      await listService.createList(board._id, member._id, { name: 'In Progress' });
      let error;
      try {
        await listService.renameList(list._id, member._id, 'In Progress');
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(BadRequestError);
    });

    test('should block viewer from renaming list', async () => {
      let error;
      try {
        await listService.renameList(list._id, viewer._id, 'Rename Hack');
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenError);
    });
  });

  describe('Reorder List', () => {
    let listA;
    let listB;
    let listC;

    beforeEach(async () => {
      listA = await listService.createList(board._id, member._id, { name: 'To Do' });
      listB = await listService.createList(board._id, member._id, { name: 'In Progress' });
      listC = await listService.createList(board._id, member._id, { name: 'Done' });
    });

    test('should reorder a list and shift positions of other lists correctly', async () => {
      // Reorder Done (index 2) to target position 0
      const reordered = await listService.reorderList(listC._id, member._id, 0);
      expect(reordered.position).toBe(0);

      // Verify sequence and DB updates
      const dbLists = await List.find({ boardId: board._id, isDeleted: { $ne: true } }).sort({ position: 1 });
      expect(dbLists).toHaveLength(3);
      expect(dbLists[0]._id.toString()).toBe(listC._id.toString());
      expect(dbLists[0].position).toBe(0);
      expect(dbLists[1]._id.toString()).toBe(listA._id.toString());
      expect(dbLists[1].position).toBe(1);
      expect(dbLists[2]._id.toString()).toBe(listB._id.toString());
      expect(dbLists[2].position).toBe(2);

      // Verify Board listOrder matches sequence
      const dbBoard = await Board.findById(board._id);
      expect(dbBoard.listOrder[0].toString()).toBe(listC._id.toString());
      expect(dbBoard.listOrder[1].toString()).toBe(listA._id.toString());
      expect(dbBoard.listOrder[2].toString()).toBe(listB._id.toString());
    });
  });

  describe('Delete List', () => {
    let list;
    let task;

    beforeEach(async () => {
      list = await listService.createList(board._id, member._id, { name: 'To Do' });
      task = await Task.create({
        title: 'Cleanup Task',
        listId: list._id,
        boardId: board._id,
        createdBy: member._id,
        position: 0
      });
    });

    test('should soft delete list and cascade soft delete to its tasks', async () => {
      await listService.deleteList(list._id, member._id);

      // List is soft deleted
      const dbList = await List.findById(list._id);
      expect(dbList.isDeleted).toBe(true);
      expect(dbList.deletedAt).toBeDefined();

      // Task is soft deleted
      const dbTask = await Task.findById(task._id);
      expect(dbTask.isDeleted).toBe(true);
      expect(dbTask.deletedAt).toBeDefined();

      // Board listOrder sequence should no longer contain list ID
      const dbBoard = await Board.findById(board._id);
      expect(dbBoard.listOrder).not.toContain(list._id);
    });
  });
});
