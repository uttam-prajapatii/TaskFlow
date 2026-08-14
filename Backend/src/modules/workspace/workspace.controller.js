import workspaceService from './workspace.service.js';
import ApiResponse from '../../utils/apiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { BadRequestError } from '../../utils/errors.js';

class WorkspaceController {
  /**
   * Create a new workspace.
   */
  createWorkspace = asyncHandler(async (req, res) => {
    const workspace = await workspaceService.createWorkspace(req.user._id, req.body);
    return ApiResponse.created(res, 'Workspace created successfully', workspace);
  });

  listWorkspaces = asyncHandler(async (req, res) => {
    const page = req.query.page ? Number.parseInt(req.query.page, 10) : 1;
    const limit = req.query.limit ? Number.parseInt(req.query.limit, 10) : 10;
    const view = req.query.view || 'full';

    if (Number.isNaN(page) || page < 1) {
      throw new BadRequestError('Page number must be a positive integer');
    }
    if (Number.isNaN(limit) || limit < 1 || limit > 100) {
      throw new BadRequestError('Limit must be a positive integer between 1 and 100');
    }
    if (view !== 'compact' && view !== 'full') {
      throw new BadRequestError("View parameter must be either 'compact' or 'full'");
    }

    const result = await workspaceService.listWorkspaces(req.user._id, { page, limit, view });
    return ApiResponse.success(res, 'Workspaces retrieved successfully', result);
  });

  /**
   * Get a single workspace's details.
   */
  getWorkspaceDetails = asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const workspace = await workspaceService.getWorkspaceDetails(workspaceId, req.user._id);
    return ApiResponse.success(res, 'Workspace details retrieved successfully', workspace);
  });

  /**
   * Update workspace details.
   */
  updateWorkspace = asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const workspace = await workspaceService.updateWorkspace(workspaceId, req.user._id, req.body);
    return ApiResponse.success(res, 'Workspace updated successfully', workspace);
  });

  /**
   * Soft delete a workspace.
   */
  deleteWorkspace = asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    await workspaceService.softDeleteWorkspace(workspaceId, req.user._id);
    return ApiResponse.success(res, 'Workspace deleted successfully', null);
  });

  /**
   * List all members of a workspace.
   */
  listMembers = asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const members = await workspaceService.listMembers(workspaceId, req.user._id);
    return ApiResponse.success(res, 'Workspace members retrieved successfully', members);
  });

  /**
   * Invite a member to the workspace.
   */
  inviteMember = asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const invite = await workspaceService.inviteMember(workspaceId, req.user._id, req.body);
    return ApiResponse.created(res, 'Member invited successfully', invite);
  });

  /**
   * List pending invitations.
   */
  listPendingInvites = asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const invites = await workspaceService.listPendingInvites(workspaceId, req.user._id);
    return ApiResponse.success(res, 'Pending invitations retrieved successfully', invites);
  });

  /**
   * Accept invitation.
   */
  acceptInvite = asyncHandler(async (req, res) => {
    const { token } = req.params;
    const result = await workspaceService.acceptInvite(token, req.user);
    return ApiResponse.success(res, result.message, result);
  });

  /**
   * Revoke (soft-delete) invitation.
   */
  revokeInvite = asyncHandler(async (req, res) => {
    const { workspaceId, inviteId } = req.params;
    await workspaceService.revokeInvite(workspaceId, inviteId, req.user._id);
    return ApiResponse.success(res, 'Invitation revoked successfully', null);
  });

  /**
   * Change role of a member.
   */
  changeMemberRole = asyncHandler(async (req, res) => {
    const { workspaceId, userId } = req.params;
    const members = await workspaceService.changeMemberRole(workspaceId, req.user._id, userId, req.body.role);
    return ApiResponse.success(res, 'Member role updated successfully', members);
  });

  /**
   * Remove a member.
   */
  removeMember = asyncHandler(async (req, res) => {
    const { workspaceId, userId } = req.params;
    await workspaceService.removeMember(workspaceId, req.user._id, userId);
    return ApiResponse.success(res, 'Member removed successfully', null);
  });

  /**
   * Leave a workspace self.
   */
  leaveWorkspace = asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    await workspaceService.leaveWorkspace(workspaceId, req.user._id);
    return ApiResponse.success(res, 'You have left the workspace successfully', null);
  });

  /**
   * Retrieve workspace analytics (task completion velocity, cycle time).
   */
  getWorkspaceAnalytics = asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const analytics = await workspaceService.getWorkspaceAnalytics(workspaceId, req.user._id);
    return ApiResponse.success(res, 'Workspace analytics retrieved successfully', analytics);
  });

  /**
   * Upload workspace logo.
   */
  uploadLogo = asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const workspace = await workspaceService.uploadLogo(workspaceId, req.user._id, req.file);
    return ApiResponse.success(res, 'Workspace logo uploaded successfully', workspace);
  });

  /**
   * Search workspace members by name or email.
   */
  searchMembers = asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const { q, query, limit, page } = req.query;
    const searchQ = q || query || '';
    const members = await workspaceService.searchMembers(workspaceId, req.user._id, {
      q: searchQ,
      limit,
      page
    });
    return ApiResponse.success(res, 'Members searched successfully', members);
  });
}

export default new WorkspaceController();
