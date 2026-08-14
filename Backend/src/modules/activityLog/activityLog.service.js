import activityLogRepository from './activityLog.repository.js';
import workspaceRepository from '../workspace/workspace.repository.js';
import { getStrId } from '../task/task.utils.js';
import { ForbiddenError, NotFoundError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

class ActivityLogService {
  /**
   * Log a new activity asynchronously.
   * Runs in a safe try-catch block so logging errors do not crash main database operations.
   */
  async logActivity(workspaceId, actorId, action, entityType, entityId, metadata = {}) {
    try {
      if (!workspaceId || !actorId || !action || !entityType || !entityId) {
        return;
      }
      
      await activityLogRepository.createActivityLog({
        workspaceId,
        actorId,
        action,
        entityType,
        entityId,
        metadata
      });
    } catch (err) {
      logger.error('Failed to log audit activity', {
        error: err.message,
        workspaceId,
        actorId,
        action
      });
    }
  }

  /**
   * Retrieve workspace activity logs.
   * Actor user must be a workspace member or owner.
   */
  async getWorkspaceActivityLogs(workspaceId, userId, query) {
    const workspace = await workspaceRepository.findWorkspaceByIdOrSlug(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const ownerStrId = getStrId(workspace.ownerId);
    const userStrId = userId.toString();

    const isOwner = ownerStrId === userStrId;
    const isMember = workspace.members.some(
      (m) => m.userId && getStrId(m.userId) === userStrId
    );

    if (!isOwner && !isMember) {
      throw new ForbiddenError('You do not have access to this workspace activity log');
    }

    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;

    return activityLogRepository.findActivityLogsByWorkspace(workspace._id, { page, limit });
  }

  /**
   * Retrieve activity logs for a specific task.
   */
  async getTaskActivityLogs(taskId, { page, limit }) {
    return activityLogRepository.findActivityLogsByTask(taskId, { page, limit });
  }
}

export default new ActivityLogService();
