import express from 'express';
import boardController from './board.controller.js';
import { validateCreateBoard, validateUpdateBoard } from './board.validation.js';
import { protect } from '../auth/auth.middleware.js';

const router = express.Router();

// Routes for workspace-scoped boards
router.post('/workspaces/:workspaceId/boards', protect, validateCreateBoard, boardController.createBoard);
router.get('/workspaces/:workspaceId/boards', protect, boardController.listBoards);

// Routes for individual boards
router.get('/boards/:boardId', protect, boardController.getBoardDetails);
router.patch('/boards/:boardId', protect, validateUpdateBoard, boardController.updateBoard);
router.post('/boards/:boardId/archive', protect, boardController.archiveBoard);
router.delete('/boards/:boardId', protect, boardController.deleteBoard);
router.post('/boards/:boardId/restore', protect, boardController.restoreBoard);

export default router;
