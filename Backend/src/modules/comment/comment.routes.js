import express from 'express';
import commentController from './comment.controller.js';
import { protect } from '../auth/auth.middleware.js';
import { validateTaskIdParam, validateCommentIdParam, validateCreateComment } from './comment.validation.js';

const router = express.Router();

// Define routes for task comments
router.post('/tasks/:taskId/comments', protect, validateTaskIdParam, validateCreateComment, commentController.addComment);
router.get('/tasks/:taskId/comments', protect, validateTaskIdParam, commentController.getComments);
router.patch('/tasks/:taskId/comments/:commentId', protect, validateTaskIdParam, validateCommentIdParam, validateCreateComment, commentController.updateComment);
router.delete('/tasks/:taskId/comments/:commentId', protect, validateTaskIdParam, validateCommentIdParam, commentController.deleteComment);

export default router;
