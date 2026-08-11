import express from 'express';
import notificationController from './notification.controller.js';
import { protect } from '../auth/auth.middleware.js';
import { validateNotificationId, validateListNotifications } from './notification.validation.js';

const router = express.Router();

// All routes inside notification router require authentication
router.use(protect);

router.get('/', validateListNotifications, notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/:id/read', validateNotificationId, notificationController.markAsRead);
router.post('/read-all', notificationController.markAllAsRead);
router.delete('/:id', validateNotificationId, notificationController.deleteNotification);

export default router;
