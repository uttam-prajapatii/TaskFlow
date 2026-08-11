import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import notificationService from '../src/modules/notification/notification.service.js';
import { Notification } from '../src/modules/notification/notification.model.js';
import User from '../src/modules/auth/user.model.js';
import redisClient from '../src/config/redis.js';

process.env.NODE_ENV = 'test';
dotenv.config();

describe('Notification System Service Tests', () => {
  let userId;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/taskflow_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const user = await User.create({ fullName: 'Notify User', email: 'notify@test.com', password: 'password123', isActive: true });
    userId = user._id;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Notification.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Notification.deleteMany({});
  });

  test('should create and retrieve notifications for a user', async () => {
    await notificationService.createAndSendNotification(userId, 'system', {
      message: 'Welcome to TaskFlow'
    });

    const result = await notificationService.getUserNotifications(userId, { page: 1, limit: 10 });
    expect(result.notifications.length).toBe(1);
    expect(result.notifications[0].type).toBe('system');
    expect(result.notifications[0].payload.message).toBe('Welcome to TaskFlow');
    expect(result.notifications[0].isRead).toBe(false);
  });

  test('should mark notification as read', async () => {
    const notif = await notificationService.createAndSendNotification(userId, 'task', {
      message: 'Task Assigned'
    });

    const updated = await notificationService.markAsRead(notif._id, userId);
    expect(updated.isRead).toBe(true);

    const result = await notificationService.getUserNotifications(userId, { isRead: 'false' });
    expect(result.notifications.length).toBe(0);
  });

  test('should mark all notifications as read for a user', async () => {
    await notificationService.createAndSendNotification(userId, 'task', { message: 'Task 1' });
    await notificationService.createAndSendNotification(userId, 'task', { message: 'Task 2' });

    await notificationService.markAllAsRead(userId);

    const unread = await notificationService.getUserNotifications(userId, { isRead: 'false' });
    expect(unread.notifications.length).toBe(0);

    const all = await notificationService.getUserNotifications(userId, { isRead: 'true' });
    expect(all.notifications.length).toBe(2);
  });

  test('should delete a notification', async () => {
    const notif = await notificationService.createAndSendNotification(userId, 'system', {
      message: 'Prunable notification'
    });

    await notificationService.deleteNotification(notif._id, userId);

    const result = await notificationService.getUserNotifications(userId, {});
    expect(result.notifications.length).toBe(0);
  });
});
