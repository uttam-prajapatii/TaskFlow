import express from 'express';
import workspaceController from './workspace.controller.js';
import { validateCreateWorkspace, validateUpdateWorkspace } from './workspace.validation.js';
import { protect } from '../auth/auth.middleware.js';

const router = express.Router();

// All workspace routes are protected
router.post('/', protect, validateCreateWorkspace, workspaceController.createWorkspace);
router.get('/', protect, workspaceController.listWorkspaces);
router.get('/:workspaceId', protect, workspaceController.getWorkspaceDetails);
router.patch('/:workspaceId', protect, validateUpdateWorkspace, workspaceController.updateWorkspace);
router.delete('/:workspaceId', protect, workspaceController.deleteWorkspace);

export default router;
