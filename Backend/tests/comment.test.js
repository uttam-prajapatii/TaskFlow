import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import commentService from '../src/modules/comment/comment.service.js';
import commentRepository from '../src/modules/comment/comment.repository.js';
import { Comment } from '../src/modules/comment/comment.model.js';
import { Notification } from '../src/modules/notification/notification.model.js';
import User from '../src/modules/auth/user.model.js';
import { Workspace } from '../src/modules/workspace/workspace.model.js';
import { Board } from '../src/modules/board/board.model.js';
import { List } from '../src/modules/list/list.model.js';
import { Task } from '../src/modules/task/task.model.js';
import redisClient from '../src/config/redis.js';

process.env.NODE_ENV = 'test';
dotenv.config();

describe('Comment System Integration Tests', () => {
  let userId, memberId, outsiderId;
  let workspaceId, boardId, listId, taskId;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/taskflow_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // Create test users
    const owner = await User.create({ fullName: 'Owner', email: 'owner@test.com', password: 'password123', isActive: true });
    const member = await User.create({ fullName: 'Member', email: 'member@test.com', password: 'password123', isActive: true });
    const outsider = await User.create({ fullName: 'Outsider', email: 'outsider@test.com', password: 'password123', isActive: true });

    userId = owner._id;
    memberId = member._id;
    outsiderId = outsider._id;

    // Create test workspace, board, list, task
    const workspace = await Workspace.create({
      name: 'Test Workspace',
      slug: 'test-ws-comment',
      ownerId: userId,
      members: [
        { userId: userId, role: 'admin', joinedAt: new Date() },
        { userId: memberId, role: 'member', joinedAt: new Date() }
      ]
    });
    workspaceId = workspace._id;

    const board = await Board.create({ name: 'Sprint Board', workspaceId, createdBy: userId });
    boardId = board._id;

    const list = await List.create({ name: 'To Do', boardId, position: 0 });
    listId = list._id;

    const task = await Task.create({
      title: 'Fix bugs',
      listId,
      boardId,
      position: 0,
      createdBy: userId
    });
    taskId = task._id;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Workspace.deleteMany({});
    await Board.deleteMany({});
    await List.deleteMany({});
    await Task.deleteMany({});
    await Comment.deleteMany({});
    await Notification.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Comment.deleteMany({});
    await Notification.deleteMany({});
  });

  test('should allow a member to post a comment on a task', async () => {
    const comment = await commentService.addComment(taskId, memberId, {
      body: 'I am working on this bug'
    });

    expect(comment).toBeDefined();
    expect(comment.body).toBe('I am working on this bug');
    expect(comment.authorId._id.toString()).toBe(memberId.toString());

    const comments = await commentService.getComments(taskId, memberId);
    expect(comments.length).toBe(1);
    expect(comments[0].body).toBe('I am working on this bug');
  });

  test('should block non-workspace members from posting comments', async () => {
    let threw = false;
    try {
      await commentService.addComment(taskId, outsiderId, { body: 'Unauthorized comment' });
    } catch (err) {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test('should create in-app notification when a user is mentioned in a comment', async () => {
    const comment = await commentService.addComment(taskId, userId, {
      body: 'Check this out @Member',
      mentions: [memberId]
    });

    expect(comment).toBeDefined();

    // Check notifications collection
    const notifications = await Notification.find({ userId: memberId });
    expect(notifications.length).toBe(1);
    expect(notifications[0].type).toBe('task');
    expect(notifications[0].payload.commentSnippet).toBe('Check this out @Member');
  });

  test('should allow the author to delete their comment', async () => {
    const comment = await commentService.addComment(taskId, memberId, {
      body: 'Temporary comment'
    });

    await commentService.deleteComment(taskId, comment._id, memberId);

    const comments = await commentService.getComments(taskId, memberId);
    expect(comments.length).toBe(0);
  });

  test('should allow workspace admin/owner to delete other users comments', async () => {
    const comment = await commentService.addComment(taskId, memberId, {
      body: 'Member comment'
    });

    // Owner (userId) deletes member's comment
    await commentService.deleteComment(taskId, comment._id, userId);

    const comments = await commentService.getComments(taskId, memberId);
    expect(comments.length).toBe(0);
  });

  test('should block regular members from deleting comments of other users', async () => {
    const comment = await commentService.addComment(taskId, userId, {
      body: 'Owner comment'
    });

    // Member (memberId) tries to delete owner's comment
    let threw = false;
    try {
      await commentService.deleteComment(taskId, comment._id, memberId);
    } catch (err) {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});
