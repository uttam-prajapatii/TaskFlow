import express from 'express';
import listController from './list.controller.js';
import { validateCreateList, validateRenameList, validateReorderList } from './list.validation.js';
import { protect } from '../auth/auth.middleware.js';

const router = express.Router();

// Routes for board-scoped lists
router.post('/boards/:boardId/lists', protect, validateCreateList, listController.createList);
router.get('/boards/:boardId/lists', protect, listController.getLists);

// Routes for individual lists
router.patch('/lists/:listId', protect, validateRenameList, listController.renameList);
router.patch('/lists/:listId/reorder', protect, validateReorderList, listController.reorderList);
router.delete('/lists/:listId', protect, listController.deleteList);
router.post('/lists/:listId/archive', protect, listController.archiveList);
router.post('/lists/:listId/restore', protect, listController.restoreList);

export default router;
