import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/modules/auth/user.model.js';
import { Workspace } from '../src/modules/workspace/workspace.model.js';
import { Board } from '../src/modules/board/board.model.js';
import { List } from '../src/modules/list/list.model.js';
import { Task } from '../src/modules/task/task.model.js';
import { TaskAttachment } from '../src/modules/task/taskAttachment.model.js';
import { Label } from '../src/modules/label/label.model.js';
import taskService from '../src/modules/task/task.service.js';
import listService from '../src/modules/list/list.service.js';
import { ForbiddenError, NotFoundError, BadRequestError } from '../src/utils/errors.js';

dotenv.config();

describe('Task Management Automated Tests', () => {
  let owner;
  let admin;
  let member;
  let viewer;
  let stranger;
  let workspace;
  let board;
  let listTodo;
  let listProgress;

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
    await TaskAttachment.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Workspace.deleteMany({});
    await Board.deleteMany({});
    await List.deleteMany({});
    await Task.deleteMany({});
    await TaskAttachment.deleteMany({});

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

    // Create lists using service
    listTodo = await listService.createList(board._id, member._id, { name: 'To Do' });
    listProgress = await listService.createList(board._id, member._id, { name: 'In Progress' });
  });

  describe('Create Task', () => {
    test('should allow workspace member to create a task in a list', async () => {
      const task = await taskService.createTask(listTodo._id, member._id, {
        title: 'Learn Mongoose',
        description: 'Read the documentation of Mongoose',
        priority: 'high',
        labels: ['backend', 'db']
      });

      expect(task).toBeDefined();
      expect(task.title).toBe('Learn Mongoose');
      expect(task.position).toBe(0);
      expect(task.boardId.toString()).toBe(board._id.toString());
      expect(task.listId.toString()).toBe(listTodo._id.toString());

      // Create a second task to check positioning
      const task2 = await taskService.createTask(listTodo._id, member._id, {
        title: 'Learn Express'
      });
      expect(task2.position).toBe(1);
    });

    test('should block workspace viewer from creating a task', async () => {
      let error;
      try {
        await taskService.createTask(listTodo._id, viewer._id, { title: 'Viewer Task' });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenError);
    });

    test('should block creating a task if workspace or board is archived', async () => {
      board.isArchived = true;
      await board.save();

      let error;
      try {
        await taskService.createTask(listTodo._id, member._id, { title: 'Archived Task' });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenError);
    });
  });

  describe('Get Tasks', () => {
    beforeEach(async () => {
      await taskService.createTask(listTodo._id, member._id, { title: 'Task 1', priority: 'low' });
      await taskService.createTask(listTodo._id, member._id, { title: 'Task 2', priority: 'high' });
      await taskService.createTask(listProgress._id, member._id, { title: 'Task 3', priority: 'medium' });
    });

    test('should return a flat list of tasks by default', async () => {
      const tasks = await taskService.getTasks(board._id, viewer._id, {});
      expect(tasks).toHaveLength(3);
      expect(tasks[0].title).toBe('Task 1');
      expect(tasks[2].title).toBe('Task 3');
    });

    test('should return grouped tasks when requested', async () => {
      const response = await taskService.getTasks(board._id, viewer._id, { groupBy: 'list' });
      expect(response.lists).toBeDefined();
      expect(response.lists).toHaveLength(2);

      const todoGroup = response.lists.find((g) => g.listName === 'To Do');
      expect(todoGroup.tasks).toHaveLength(2);
      expect(todoGroup.tasks[0].title).toBe('Task 1');
      expect(todoGroup.tasks[1].title).toBe('Task 2');

      const progressGroup = response.lists.find((g) => g.listName === 'In Progress');
      expect(progressGroup.tasks).toHaveLength(1);
      expect(progressGroup.tasks[0].title).toBe('Task 3');
    });
  });

  describe('Get Task Details', () => {
    let task;
    beforeEach(async () => {
      task = await taskService.createTask(listTodo._id, member._id, { title: 'Task Details' });
    });

    test('should allow workspace viewer to see task details', async () => {
      const details = await taskService.getTaskDetails(task._id, viewer._id);
      expect(details).toBeDefined();
      expect(details.title).toBe('Task Details');
      expect(details.createdBy).toBeDefined();
      expect(details.createdBy.fullName).toBe('Workspace Member');
    });

    test('should block stranger from seeing task details', async () => {
      let error;
      try {
        await taskService.getTaskDetails(task._id, stranger._id);
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenError);
    });
  });

  describe('Update Task', () => {
    let task;
    beforeEach(async () => {
      task = await taskService.createTask(listTodo._id, member._id, { title: 'Old Title', priority: 'low' });
    });

    test('should allow member to update task fields and ignore read-only fields', async () => {
      const updated = await taskService.updateTask(task._id, member._id, {
        title: 'New Title',
        priority: 'high',
        position: 100 // should be ignored
      });

      expect(updated.title).toBe('New Title');
      expect(updated.priority).toBe('high');
      expect(updated.position).toBe(0); // remains unchanged
    });
  });

  describe('Move Task', () => {
    let t1, t2, t3;
    beforeEach(async () => {
      t1 = await taskService.createTask(listTodo._id, member._id, { title: 'T1' });
      t2 = await taskService.createTask(listTodo._id, member._id, { title: 'T2' });
      t3 = await taskService.createTask(listTodo._id, member._id, { title: 'T3' });
    });

    test('should reorder within the same list', async () => {
      // move T1 (pos 0) to pos 1
      await taskService.moveTask(t1._id, member._id, { position: 1 });
      
      const tasks = await taskService.getTasks(board._id, viewer._id, {});
      const todoTasks = tasks.filter((t) => t.listId.toString() === listTodo._id.toString());
      expect(todoTasks[0].title).toBe('T2');
      expect(todoTasks[1].title).toBe('T1');
      expect(todoTasks[2].title).toBe('T3');
    });

    test('should move across different lists', async () => {
      // move T2 from To Do to In Progress pos 0
      await taskService.moveTask(t2._id, member._id, { listId: listProgress._id, position: 0 });

      const tasks = await taskService.getTasks(board._id, viewer._id, {});
      const todoTasks = tasks.filter((t) => t.listId.toString() === listTodo._id.toString());
      const progressTasks = tasks.filter((t) => t.listId.toString() === listProgress._id.toString());

      expect(todoTasks).toHaveLength(2);
      expect(todoTasks[0].title).toBe('T1');
      expect(todoTasks[1].title).toBe('T3');

      expect(progressTasks).toHaveLength(1);
      expect(progressTasks[0].title).toBe('T2');
      expect(progressTasks[0].position).toBe(0);
    });
  });

  describe('Delete / Archive / Restore', () => {
    let task;
    beforeEach(async () => {
      task = await taskService.createTask(listTodo._id, member._id, { title: 'Removable Task' });
    });

    test('should soft-delete task and update subsequent positions', async () => {
      const task2 = await taskService.createTask(listTodo._id, member._id, { title: 'Second Task' });
      expect(task2.position).toBe(1);

      await taskService.deleteTask(task._id, member._id);

      const tasks = await taskService.getTasks(board._id, viewer._id, {});
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Second Task');
      expect(tasks[0].position).toBe(0); // position recalculated
    });

    test('should archive and restore task', async () => {
      // 1. Archive
      await taskService.archiveTask(task._id, member._id);
      let tasks = await taskService.getTasks(board._id, viewer._id, { isArchived: 'false' });
      expect(tasks).toHaveLength(0);

      tasks = await taskService.getTasks(board._id, viewer._id, { isArchived: 'true' });
      expect(tasks).toHaveLength(1);
      expect(tasks[0].isArchived).toBe(true);

      // 2. Restore
      await taskService.restoreTask(task._id, member._id);
      tasks = await taskService.getTasks(board._id, viewer._id, { isArchived: 'false' });
      expect(tasks).toHaveLength(1);
      expect(tasks[0].isArchived).toBe(false);
    });
  });

  describe('Checklist Operations', () => {
    let task;
    beforeEach(async () => {
      task = await taskService.createTask(listTodo._id, member._id, { title: 'Checklist Task' });
    });

    test('should add, update and remove checklist items', async () => {
      // 1. Add
      let updated = await taskService.checklistOperation(task._id, member._id, {
        action: 'add',
        text: 'Item A'
      });
      expect(updated.checklist).toHaveLength(1);
      expect(updated.checklist[0].text).toBe('Item A');
      expect(updated.checklist[0].isDone).toBe(false);

      const itemId = updated.checklist[0]._id;

      // 2. Update
      updated = await taskService.checklistOperation(task._id, member._id, {
        action: 'update',
        itemId,
        text: 'Item A Revised',
        isDone: true
      });
      expect(updated.checklist[0].text).toBe('Item A Revised');
      expect(updated.checklist[0].isDone).toBe(true);

      // 3. Remove
      updated = await taskService.checklistOperation(task._id, member._id, {
        action: 'remove',
        itemId
      });
      expect(updated.checklist).toHaveLength(0);
    });
  });

  describe('Assignees', () => {
    let task;
    beforeEach(async () => {
      task = await taskService.createTask(listTodo._id, member._id, { title: 'Assignee Task' });
    });

    test('should assign and unassign a workspace member', async () => {
      // 1. Add assignee
      let updated = await taskService.addAssignee(task._id, member._id, admin._id);
      expect(updated.assignees).toHaveLength(1);
      expect(updated.assignees[0].toString()).toBe(admin._id.toString());

      // 2. Remove assignee
      updated = await taskService.removeAssignee(task._id, member._id, admin._id);
      expect(updated.assignees).toHaveLength(0);
    });

    test('should reject assigning non-workspace user', async () => {
      let error;
      try {
        await taskService.addAssignee(task._id, member._id, stranger._id);
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(BadRequestError);
    });
  });

  describe('Search Tasks', () => {
    beforeEach(async () => {
      await taskService.createTask(listTodo._id, member._id, { title: 'Clean the kitchen', description: 'Sweep floor', dueDate: new Date('2026-08-10') });
      await taskService.createTask(listTodo._id, member._id, { title: 'Write tests', description: 'Verify endpoints', dueDate: new Date('2026-08-20') });
    });

    test('should filter by query string q', async () => {
      const results = await taskService.searchTasks(board._id, viewer._id, { q: 'kitchen' });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Clean the kitchen');
    });

    test('should filter by dueBefore date', async () => {
      const results = await taskService.searchTasks(board._id, viewer._id, { dueBefore: '2026-08-15' });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Clean the kitchen');
    });

    test('should throw BadRequestError on invalid dueBefore date format', async () => {
      let error;
      try {
        await taskService.searchTasks(board._id, viewer._id, { dueBefore: 'invalid-date' });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(BadRequestError);
    });
  });

  describe('Task Attachments', () => {
    let task;
    let mockFile;

    beforeEach(async () => {
      task = await taskService.createTask(listTodo._id, member._id, { title: 'Attachment Target Task' });
      mockFile = {
        buffer: Buffer.from('mock file content'),
        originalname: 'spec_document.pdf',
        mimetype: 'application/pdf',
        size: 100
      };
    });

    test('should allow workspace member to upload an attachment and push to task array', async () => {
      const attachment = await taskService.uploadAttachment(task._id, member._id, mockFile);
      
      expect(attachment).toBeDefined();
      expect(attachment.fileName).toBe('spec_document.pdf');
      expect(attachment.mimeType).toBe('application/pdf');
      expect(attachment.sizeBytes).toBe(100);
      expect(attachment.uploadedBy.toString()).toBe(member._id.toString());
      expect(attachment.storageKey).toContain(`taskflow/workspaces/${workspace._id.toString()}/boards/${board._id.toString()}/tasks/${task._id.toString()}`);

      // Verify task references it
      const updatedTask = await Task.findById(task._id);
      expect(updatedTask.attachments).toHaveLength(1);
      expect(updatedTask.attachments[0].toString()).toBe(attachment._id.toString());
    });

    test('should block workspace viewer from uploading an attachment', async () => {
      let error;
      try {
        await taskService.uploadAttachment(task._id, viewer._id, mockFile);
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenError);
    });

    test('should allow workspace member to delete task attachment', async () => {
      const attachment = await taskService.uploadAttachment(task._id, member._id, mockFile);
      
      // Delete
      await taskService.deleteAttachment(task._id, attachment._id, member._id);

      // Verify db document deleted
      const checkDoc = await TaskAttachment.findById(attachment._id);
      expect(checkDoc).toBeNull();

      // Verify reference pulled from task
      const updatedTask = await Task.findById(task._id);
      expect(updatedTask.attachments).toHaveLength(0);
    });

    test('should block workspace viewer from deleting task attachment', async () => {
      const attachment = await taskService.uploadAttachment(task._id, member._id, mockFile);

      let error;
      try {
        await taskService.deleteAttachment(task._id, attachment._id, viewer._id);
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenError);
    });
  });

  describe('Get Assigned Tasks (Me)', () => {
    test('should return tasks assigned to the current user', async () => {
      const task = await taskService.createTask(listTodo._id, member._id, {
        title: 'Assigned Task 1'
      });
      await taskService.addAssignee(task._id, member._id, member._id);

      const results = await taskService.getAssignedTasks(member._id, {});
      expect(results).toBeDefined();
      expect(results.length).toBe(1);
      expect(results[0]._id.toString()).toBe(task._id.toString());
      expect(results[0].assignees[0]._id.toString()).toBe(member._id.toString());
    });

    test('should filter out tasks from private boards where user has no access', async () => {
      const privateBoard = await Board.create({
        name: 'Private Board',
        workspaceId: workspace._id,
        createdBy: member._id,
        visibility: 'private'
      });
      const listPrivate = await listService.createList(privateBoard._id, member._id, { name: 'Private Todo' });
      
      const task = await taskService.createTask(listPrivate._id, member._id, {
        title: 'Private Task'
      });
      await taskService.addAssignee(task._id, member._id, viewer._id);

      const results = await taskService.getAssignedTasks(viewer._id, {});
      expect(results.length).toBe(0);
    });

    test('should filter assigned tasks by priority', async () => {
      const taskHigh = await taskService.createTask(listTodo._id, member._id, {
        title: 'High Priority Task',
        priority: 'high'
      });
      const taskLow = await taskService.createTask(listTodo._id, member._id, {
        title: 'Low Priority Task',
        priority: 'low'
      });

      await taskService.addAssignee(taskHigh._id, member._id, member._id);
      await taskService.addAssignee(taskLow._id, member._id, member._id);

      const results = await taskService.getAssignedTasks(member._id, { priority: 'high' });
      expect(results.length).toBe(1);
      expect(results[0]._id.toString()).toBe(taskHigh._id.toString());
    });
  });

  describe('Get Task Activity Logs', () => {
    test('should allow workspace viewer to see task details activity logs', async () => {
      const task = await taskService.createTask(listTodo._id, member._id, {
        title: 'Activity Log Task'
      });

      const result = await taskService.getTaskActivityLogs(task._id, viewer._id, {});
      expect(result).toBeDefined();
      expect(result.logs.length).toBeGreaterThan(0);
      expect(result.logs[0].action).toBe('task:create');
      expect(result.logs[0].actorId.fullName).toBe('Workspace Member');
    });

    test('should block stranger from seeing task activity logs', async () => {
      const task = await taskService.createTask(listTodo._id, member._id, {
        title: 'Secure Activity Log Task'
      });

      let error;
      try {
        await taskService.getTaskActivityLogs(task._id, stranger._id, {});
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenError);
    });
  });
});
