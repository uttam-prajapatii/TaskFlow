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
}

export default new WorkspaceController();
