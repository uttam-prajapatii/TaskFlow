import activityLogService from './activityLog.service.js';
import asyncHandler from '../../utils/asyncHandler.js';

class ActivityLogController {
  /**
   * Fetch paginated activity logs for a specific workspace.
   */
  getActivityLogs = asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const userId = req.user._id;

    const result = await activityLogService.getWorkspaceActivityLogs(workspaceId, userId, req.query);

    res.status(200).json({
      status: 'success',
      data: result
    });
  });
}

export default new ActivityLogController();
