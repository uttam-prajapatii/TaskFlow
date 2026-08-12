import express from 'express';
import labelController from './label.controller.js';
import { protect } from '../auth/auth.middleware.js';
import { validateLabelId, validateCreateLabel, validateUpdateLabel } from './label.validation.js';
import { validateBoardIdParam } from '../task/task.validation.js';

const router = express.Router();

// All label routes require authentication
router.use(protect);

router.post('/boards/:boardId/labels', validateBoardIdParam, validateCreateLabel, labelController.createLabel);
router.get('/boards/:boardId/labels', validateBoardIdParam, labelController.getLabels);
router.patch('/labels/:labelId', validateLabelId, validateUpdateLabel, labelController.updateLabel);
router.delete('/labels/:labelId', validateLabelId, labelController.deleteLabel);

export default router;
