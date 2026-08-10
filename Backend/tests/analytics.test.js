import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import workspaceService from '../src/modules/workspace/workspace.service.js';
import User from '../src/modules/auth/user.model.js';
import { Workspace } from '../src/modules/workspace/workspace.model.js';
import { Board } from '../src/modules/board/board.model.js';
import { List } from '../src/modules/list/list.model.js';
import { Task } from '../src/modules/task/task.model.js';
import { ActivityLog } from '../src/modules/activityLog/activityLog.model.js';
import redisClient from '../src/config/redis.js';

process.env.NODE_ENV = 'test';
dotenv.config();

describe('Workspace Analytics System Tests', () => {
  let userId, workspaceId, boardId, listId;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/taskflow_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // Create user, workspace, board, list
    const user = await User.create({ fullName: 'Analytics User', email: 'analytics@test.com', password: 'password123', isActive: true });
    userId = user._id;

    const workspace = await Workspace.create({
      name: 'Analytics Workspace',
      slug: 'analytics-ws',
      ownerId: userId,
      members: [{ userId: userId, role: 'admin', joinedAt: new Date() }]
    });
    workspaceId = workspace._id;

    const board = await Board.create({ name: 'Development Board', workspaceId, createdBy: userId });
    boardId = board._id;

    const list = await List.create({ name: 'Done', boardId, position: 0 }); // Named 'Done' to match analytics filter
    listId = list._id;

    // Create a task that was completed
    const task = await Task.create({
      title: 'Develop analytics',
      listId,
      boardId,
      position: 0,
      createdBy: userId,
      priority: 'high',
      updatedAt: new Date()
    });

    // Log activity for creation and completion to test cycle time calculation
    const createTime = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    const completeTime = new Date(); // now

    await ActivityLog.create({
      workspaceId,
      actorId: userId,
      action: 'task:create',
      entityType: 'Task',
      entityId: task._id,
      createdAt: createTime
    });

    await ActivityLog.create({
      workspaceId,
      actorId: userId,
      action: 'task:completed',
      entityType: 'Task',
      entityId: task._id,
      createdAt: completeTime
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Workspace.deleteMany({});
    await Board.deleteMany({});
    await List.deleteMany({});
    await Task.deleteMany({});
    await ActivityLog.deleteMany({});
    await mongoose.connection.close();
  });

  test('should retrieve valid workspace analytics', async () => {
    const analytics = await workspaceService.getWorkspaceAnalytics(workspaceId, userId);

    expect(analytics).toBeDefined();
    expect(analytics.totalBoards).toBe(1);
    expect(analytics.totalTasks).toBe(1);
    expect(analytics.completedTasksCount).toBe(1);
    expect(analytics.activeTasksCount).toBe(0);
    expect(analytics.priorityBreakdown.high).toBe(1);
    expect(analytics.priorityBreakdown.low).toBe(0);
    expect(analytics.averageCycleTimeDays).toBe(3); // 3 days
  });
});
