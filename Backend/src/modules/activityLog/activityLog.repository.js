import { ActivityLog } from './activityLog.model.js';

class ActivityLogRepository {
  /**
   * Log an activity record in the database.
   */
  async createActivityLog(data) {
    return ActivityLog.create(data);
  }

  /**
   * Fetch paginated activity logs for a workspace, sorted from newest to oldest.
   * Populates details about the acting user.
   */
  async findActivityLogsByWorkspace(workspaceId, { page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      ActivityLog.find({ workspaceId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actorId', '_id name email avatarUrl')
        .lean(),
      ActivityLog.countDocuments({ workspaceId })
    ]);

    return { logs, total, page, limit };
  }
}

export default new ActivityLogRepository();
