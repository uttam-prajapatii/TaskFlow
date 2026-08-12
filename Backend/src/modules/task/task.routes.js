import express from 'express';
import taskController from './task.controller.js';
import { protect } from '../auth/auth.middleware.js';
import {
  validateTaskId,
  validateListIdParam,
  validateBoardIdParam,
  validateUserIdParam,
  validateCreateTask,
  validateUpdateTask,
  validateMoveTask,
  validateChecklistOperation,
  validateAddAssignee,
  validateAttachmentIdParam
} from './task.validation.js';
import { configureUpload } from '../../middlewares/fileUpload.js';

import { validateLabelId } from '../label/label.validation.js';

const router = express.Router();

// Board and list task routes
router.post('/lists/:listId/tasks', protect, validateListIdParam, validateCreateTask, taskController.createTask);
router.get('/boards/:boardId/tasks/search', protect, validateBoardIdParam, taskController.searchTasks);
router.get('/boards/:boardId/tasks', protect, validateBoardIdParam, taskController.getTasks);

// Individual task routes
router.get('/tasks/:taskId', protect, validateTaskId, taskController.getTaskDetails);
router.patch('/tasks/:taskId', protect, validateTaskId, validateUpdateTask, taskController.updateTask);
router.patch('/tasks/:taskId/move', protect, validateTaskId, validateMoveTask, taskController.moveTask);
router.delete('/tasks/:taskId', protect, validateTaskId, taskController.deleteTask);
router.post('/tasks/:taskId/archive', protect, validateTaskId, taskController.archiveTask);
router.post('/tasks/:taskId/restore', protect, validateTaskId, taskController.restoreTask);
router.patch('/tasks/:taskId/checklist', protect, validateTaskId, validateChecklistOperation, taskController.checklistOperation);
router.post('/tasks/:taskId/assignees', protect, validateTaskId, validateAddAssignee, taskController.addAssignee);
router.delete('/tasks/:taskId/assignees/:userId', protect, validateTaskId, validateUserIdParam, taskController.removeAssignee);

// Attachment routes
router.post('/tasks/:taskId/attachments', protect, validateTaskId, configureUpload(), taskController.uploadAttachment);
router.delete('/tasks/:taskId/attachments/:attachmentId', protect, validateTaskId, validateAttachmentIdParam, taskController.deleteAttachment);

// Task label routes
router.post('/tasks/:taskId/labels', protect, validateTaskId, taskController.addLabel);
router.delete('/tasks/:taskId/labels/:labelId', protect, validateTaskId, validateLabelId, taskController.removeLabel);

export default router;
