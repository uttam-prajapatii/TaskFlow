import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/modules/auth/user.model.js';
import { Workspace } from '../src/modules/workspace/workspace.model.js';
import { Board } from '../src/modules/board/board.model.js';
import { List } from '../src/modules/list/list.model.js';
import { Task } from '../src/modules/task/task.model.js';
import Label from '../src/modules/label/label.model.js';
import labelService from '../src/modules/label/label.service.js';
import taskService from '../src/modules/task/task.service.js';
import { ForbiddenError, NotFoundError, BadRequestError } from '../src/utils/errors.js';

dotenv.config();

describe('Label Management Automated Tests', () => {
  let owner;
  let member;
  let workspace;
  let board;
  let list;

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
    await Label.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Workspace.deleteMany({});
    await Board.deleteMany({});
    await List.deleteMany({});
    await Task.deleteMany({});
    await Label.deleteMany({});

    owner = await User.create({ email: 'owner@test.com', password: 'password123', fullName: 'Workspace Owner', isActive: true });
    member = await User.create({ email: 'member@test.com', password: 'password123', fullName: 'Workspace Member', isActive: true });

    workspace = await Workspace.create({
      name: 'Test Workspace',
      slug: 'test-workspace',
      ownerId: owner._id,
      members: [
        { userId: owner._id, role: 'admin' },
        { userId: member._id, role: 'member' }
      ]
    });

    board = await Board.create({
      name: 'Label Test Board',
      workspaceId: workspace._id,
      createdBy: owner._id
    });

    list = await List.create({
      name: 'Label Test List',
      boardId: board._id,
      position: 0
    });
  });

  describe('Custom Labels CRUD & Attachment', () => {
    test('should create, update, and cascade delete label references on tasks', async () => {
      // 1. Create label
      const label = await labelService.createLabel(board._id, owner._id, {
        name: 'Feature',
        color: '#3B82F6'
      });
      expect(label).toBeDefined();
      expect(label.name).toBe('Feature');
      expect(label.color).toBe('#3B82F6');

      // 2. Create a task
      const task = await taskService.createTask(list._id, owner._id, {
        title: 'Implement Search'
      });

      // 3. Attach label to task
      const taskWithLabel = await taskService.addLabelToTask(task._id, owner._id, label._id);
      expect(taskWithLabel.labels).toContain(label._id);

      // 4. Delete label and check cascade delete on tasks
      await labelService.deleteLabel(label._id, owner._id);
      
      const dbTask = await Task.findById(task._id);
      expect(dbTask.labels).not.toContain(label._id);
      expect(dbTask.labels.length).toBe(0);
    });
  });
});
