import express from 'express';
import workspaceController from './workspace.controller.js';
import { validateCreateWorkspace, validateUpdateWorkspace, validateInviteMember, validateChangeRole } from './workspace.validation.js';
import { protect } from '../auth/auth.middleware.js';

const router = express.Router();

// All workspace routes are protected
router.post('/', protect, validateCreateWorkspace, workspaceController.createWorkspace);
router.get('/', protect, workspaceController.listWorkspaces);
router.get('/:workspaceId', protect, workspaceController.getWorkspaceDetails);
router.patch('/:workspaceId', protect, validateUpdateWorkspace, workspaceController.updateWorkspace);
router.delete('/:workspaceId', protect, workspaceController.deleteWorkspace);

// Members and invitations routes
router.get('/:workspaceId/members', protect, workspaceController.listMembers);
router.post('/:workspaceId/invites', protect, validateInviteMember, workspaceController.inviteMember);
router.get('/:workspaceId/invites', protect, workspaceController.listPendingInvites);
router.post('/invites/:token/accept', protect, workspaceController.acceptInvite);
router.delete('/:workspaceId/invites/:inviteId', protect, workspaceController.revokeInvite);
router.patch('/:workspaceId/members/:userId', protect, validateChangeRole, workspaceController.changeMemberRole);
router.delete('/:workspaceId/members/:userId', protect, workspaceController.removeMember);
router.post('/:workspaceId/leave', protect, workspaceController.leaveWorkspace);

export default router;
