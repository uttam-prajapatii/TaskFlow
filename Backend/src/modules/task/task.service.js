import mongoose from 'mongoose';
import path from 'path';
import taskRepository from './task.repository.js';
import listRepository from '../list/list.repository.js';
import boardRepository from '../board/board.repository.js';
import workspaceRepository from '../workspace/workspace.repository.js';
import logger from '../../utils/logger.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors.js';
import { getTaskAccessRights, isParentArchived, formatGroupedTasks, getStrId, getCloudinaryResourceType } from './task.utils.js';
import { getWorkspaceRole, canViewBoard } from '../board/board.utils.js';
import { uploadStream, deleteFromCloudinary } from '../../config/cloudinary.js';
import { emitToBoard } from '../../config/socket.js';
import notificationService from '../notification/notification.service.js';
import activityLogService from '../activityLog/activityLog.service.js';
import authRepository from '../auth/auth.repository.js';
import { enqueueEmail } from '../email/email.queue.js';

class TaskService {
  /**
   * Helper to validate ObjectId format.
   */
  validateId(id, label) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError(`Invalid ${label} ID format`);
    }
  }

  /**
   * Helper to retrieve and validate parent board and workspace access.
   */
  async getValidatedParentContext(boardId, userId) {
    this.validateId(boardId, 'board');

    const board = await boardRepository.findBoardById(boardId);
    if (!board) {
      throw new NotFoundError('Board not found');
    }

    const workspace = await workspaceRepository.findWorkspaceById(board.workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const access = getTaskAccessRights({ board, workspace, userId });
    return { board, workspace, access };
  }

  /**
   * Helper to retrieve list details and validate parent context.
   */
  async getValidatedListContext(listId, userId) {
    this.validateId(listId, 'list');

    const list = await listRepository.findListById(listId);
    if (!list) {
      throw new NotFoundError('List not found');
    }

    const { board, workspace, access } = await this.getValidatedParentContext(list.boardId, userId);
    return { list, board, workspace, access };
  }

  /**
   * Helper to retrieve task details and validate parent context.
   */
  async getValidatedTaskContext(taskId, userId) {
    this.validateId(taskId, 'task');

    const task = await taskRepository.findTaskById(taskId);
    if (!task) {
      throw new NotFoundError('Task not found');
    }

    const { board, workspace, access } = await this.getValidatedParentContext(task.boardId, userId);
    return { task, board, workspace, access };
  }

  /**
   * Create a new task in a list.
   * Creator must be Member role.
   */
  async createTask(listId, userId, taskData) {
    const { list, board, workspace, access } = await this.getValidatedListContext(listId, userId);

    if (!access.canWrite) {
      throw new ForbiddenError('You do not have permission to create a task on this board');
    }

    if (isParentArchived({ board, workspace })) {
      throw new ForbiddenError('Cannot create a task because the board or workspace is archived');
    }

    const existingTasks = await taskRepository.findTasksByList(listId);
    const maxPos = existingTasks.length;
    const requestedPos = typeof taskData.position === 'number' && !Number.isNaN(taskData.position)
      ? Math.max(0, Math.min(taskData.position, maxPos))
      : maxPos;

    const task = await taskRepository.createTask({
      ...taskData,
      listId,
      boardId: list.boardId,
      position: requestedPos,
      createdBy: userId
    });

    existingTasks.splice(requestedPos, 0, task);
    await taskRepository.updatePositions(existingTasks.map((t) => t._id));

    logger.info(`Task created successfully: ${task.title}`, {
      taskId: task._id,
      listId,
      boardId: list.boardId,
      createdBy: userId
    });

    // Broadcast creation to board room
    try {
      emitToBoard(list.boardId.toString(), 'task:updated', { boardId: list.boardId.toString() });
    } catch (wsError) {
      logger.warn(`Failed to broadcast task:updated Socket event: ${wsError.message}`);
    }

    // Log Activity audit trail
    await activityLogService.logActivity(
      workspace._id,
      userId,
      'task:create',
      'Task',
      task._id,
      { title: task.title }
    );

    // Notify Assignees
    if (task.assignees && task.assignees.length > 0) {
      try {
        const callerUser = await authRepository.findUserById(userId);
        const callerName = callerUser?.name || 'A teammate';

        for (const assigneeId of task.assignees) {
          if (assigneeId.toString() === userId.toString()) continue;

          const user = await authRepository.findUserById(assigneeId);
          if (user && user.email) {
            // Trigger in-app notification
            await notificationService.createAndSendNotification(assigneeId, 'task', {
              taskId: task._id.toString(),
              taskTitle: task.title,
              boardId: board._id.toString(),
              workspaceId: workspace._id.toString(),
              actorName: callerName,
              message: `${callerName} assigned you a task: "${task.title}"`
            });

            // Enqueue assignment email
            const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
            const taskUrl = `${appBaseUrl}/boards/${board._id}/tasks/${task._id}`;
            await enqueueEmail('sendAssignment', {
              toEmail: user.email,
              taskTitle: task.title,
              assignedByName: callerName,
              taskUrl
            });
          }
        }
      } catch (err) {
        logger.error(`Failed to dispatch assignment notifications for task ${task._id}: ${err.message}`);
      }
    }

    return task;
  }

  /**
   * Get all tasks of a board, optionally flat or grouped by list.
   * User must be a workspace Viewer.
   */
  async getTasks(boardId, userId, query) {
    const { access } = await this.getValidatedParentContext(boardId, userId);

    if (!access.canView) {
      throw new ForbiddenError('You do not have permission to view tasks on this board');
    }

    const filters = {};
    if (query.isArchived === 'true') {
      filters.isArchived = true;
    } else {
      filters.isArchived = false;
    }

    const tasks = await taskRepository.findTasksByBoard(boardId, filters);

    if (query.groupBy === 'list') {
      const lists = await listRepository.findListsByBoard(boardId);
      return formatGroupedTasks(lists, tasks);
    }

    return tasks;
  }

  /**
   * Get details of a single task.
   * User must be a workspace Viewer.
   */
  async getTaskDetails(taskId, userId) {
    const { task, access } = await this.getValidatedTaskContext(taskId, userId);

    if (!access.canView) {
      throw new ForbiddenError('You do not have permission to view this task');
    }

    return taskRepository.findTaskByIdPopulated(task._id);
  }

  /**
   * Update task fields.
   * Creator must be workspace Member.
   */
  async updateTask(taskId, userId, updateData) {
    const { task, board, workspace, access } = await this.getValidatedTaskContext(taskId, userId);

    if (!access.canWrite) {
      throw new ForbiddenError('You do not have permission to update tasks on this board');
    }

    if (isParentArchived({ board, workspace })) {
      throw new ForbiddenError('Cannot update task because the board or workspace is archived');
    }

    // Clean up read-only fields
    const sanitizedUpdate = { ...updateData };
    delete sanitizedUpdate._id;
    delete sanitizedUpdate.listId;
    delete sanitizedUpdate.boardId;
    delete sanitizedUpdate.position;
    delete sanitizedUpdate.createdBy;
    delete sanitizedUpdate.createdAt;

    const updatedTask = await taskRepository.updateTask(taskId, sanitizedUpdate);

    logger.info(`Task updated successfully: ${updatedTask.title}`, {
      taskId,
      updatedBy: userId
    });

    // Broadcast updated task to board room
    try {
      emitToBoard(board._id.toString(), 'task:updated', updatedTask);
    } catch (wsError) {
      logger.warn(`Failed to broadcast task:updated Socket event: ${wsError.message}`);
    }

    // Log Activity audit log
    await activityLogService.logActivity(
      workspace._id,
      userId,
      'task:update',
      'Task',
      taskId,
      { title: updatedTask.title, updatedFields: Object.keys(sanitizedUpdate) }
    );

    return updatedTask;
  }

  /**
   * Move task to another list/position.
   * User must be workspace Member.
   */
  async moveTask(taskId, userId, { listId: targetListId, position: targetPosition }) {
    const { task, board, workspace, access } = await this.getValidatedTaskContext(taskId, userId);

    if (!access.canWrite) {
      throw new ForbiddenError('You do not have permission to move tasks on this board');
    }

    if (isParentArchived({ board, workspace })) {
      throw new ForbiddenError('Cannot move task because the board or workspace is archived');
    }

    const currentListId = getStrId(task.listId);
    const targetListIdStr = targetListId ? getStrId(targetListId) : currentListId;

    if (targetListId) {
      const targetList = await listRepository.findListById(targetListId);
      if (!targetList) {
        throw new NotFoundError('Target list not found');
      }
      if (getStrId(targetList.boardId) !== getStrId(task.boardId)) {
        throw new BadRequestError('Cannot move task to a list on a different board');
      }
    }

    if (currentListId !== targetListIdStr) {
      // 1. Fetch source tasks, remove task from source list
      const sourceTasks = await taskRepository.findTasksByList(currentListId);
      const taskIndex = sourceTasks.findIndex((t) => getStrId(t._id) === getStrId(taskId));
      if (taskIndex !== -1) {
        sourceTasks.splice(taskIndex, 1);
      }
      // Re-index source list
      await taskRepository.updatePositions(sourceTasks.map((t) => t._id));

      // 2. Fetch target tasks, insert task into target list
      const targetTasks = await taskRepository.findTasksByList(targetListIdStr);
      const safePosition = Math.max(0, Math.min(targetPosition, targetTasks.length));
      targetTasks.splice(safePosition, 0, task);
      
      // Re-index target list
      await taskRepository.updatePositions(targetTasks.map((t) => t._id));

      // 3. Update task parent list references
      task.listId = targetListIdStr;
      await task.save();
    } else {
      // Same list reordering
      const tasksInList = await taskRepository.findTasksByList(currentListId);
      const taskIdx = tasksInList.findIndex((t) => getStrId(t._id) === getStrId(taskId));
      if (taskIdx !== -1) {
        const [movedTask] = tasksInList.splice(taskIdx, 1);
        const safePosition = Math.max(0, Math.min(targetPosition, tasksInList.length));
        tasksInList.splice(safePosition, 0, movedTask);
        await taskRepository.updatePositions(tasksInList.map((t) => t._id));
      }
    }

    const updated = await taskRepository.findTaskById(taskId);

    // Broadcast movement to board room
    try {
      emitToBoard(board._id.toString(), 'task:updated', updated);
    } catch (wsError) {
      logger.warn(`Failed to broadcast task:updated Socket event: ${wsError.message}`);
    }

    // Log Activity audit log (moving or completed)
    try {
      const targetList = await listRepository.findListById(targetListIdStr);
      const isDone = targetList && /done|completed/i.test(targetList.name);
      const actionType = isDone ? 'task:completed' : 'task:move';

      await activityLogService.logActivity(
        workspace._id,
        userId,
        actionType,
        'Task',
        taskId,
        {
          title: task.title,
          fromListId: currentListId,
          toListId: targetListIdStr,
          position: targetPosition
        }
      );
    } catch (logErr) {
      logger.warn(`Failed to log task movement activity log: ${logErr.message}`);
    }

    logger.info(`Task moved successfully`, {
      taskId,
      targetListId: targetListIdStr,
      targetPosition,
      movedBy: userId
    });

    return updated;
  }

  /**
   * Soft-delete a task.
   * User must be workspace Member.
   */
  async deleteTask(taskId, userId) {
    const { task, board, workspace, access } = await this.getValidatedTaskContext(taskId, userId);

    if (!access.canWrite) {
      throw new ForbiddenError('You do not have permission to delete tasks on this board');
    }

    if (isParentArchived({ board, workspace })) {
      throw new ForbiddenError('Cannot delete task because the board or workspace is archived');
    }

    // Soft delete task
    await taskRepository.softDeleteTask(taskId);

    // Re-index remaining tasks in list
    const remainingTasks = await taskRepository.findTasksByList(task.listId);
    await taskRepository.updatePositions(remainingTasks.map((t) => t._id));

    // Broadcast deletion to board room
    try {
      emitToBoard(board._id.toString(), 'task:updated', { taskId, listId: task.listId, isDeleted: true });
    } catch (wsError) {
      logger.warn(`Failed to broadcast task:updated Socket event: ${wsError.message}`);
    }

    // Log Activity audit log
    await activityLogService.logActivity(
      workspace._id,
      userId,
      'task:delete',
      'Task',
      taskId,
      { title: task.title }
    );

    // Queue permanently hard-delete job in 30 days
    try {
      await enqueueEmail('hardDeleteTask', { taskId }, { delay: 30 * 24 * 60 * 60 * 1000 });
    } catch (err) {
      logger.warn(`Failed to schedule hardDeleteTask BullMQ job: ${err.message}`);
    }

    logger.info(`Task soft-deleted successfully`, {
      taskId,
      deletedBy: userId
    });
  }

  /**
   * Archive a task.
   * User must be workspace Member.
   */
  async archiveTask(taskId, userId) {
    const { board, workspace, access } = await this.getValidatedTaskContext(taskId, userId);

    if (!access.canWrite) {
      throw new ForbiddenError('You do not have permission to archive tasks on this board');
    }

    if (isParentArchived({ board, workspace })) {
      throw new ForbiddenError('Cannot archive task because the board or workspace is archived');
    }

    const archivedTask = await taskRepository.updateTask(taskId, { isArchived: true });

    logger.info(`Task archived successfully`, {
      taskId,
      archivedBy: userId
    });

    return archivedTask;
  }

  /**
   * Restore a task from archive.
   * User must be workspace Member.
   */
  async restoreTask(taskId, userId) {
    const { board, workspace, access } = await this.getValidatedTaskContext(taskId, userId);

    if (!access.canWrite) {
      throw new ForbiddenError('You do not have permission to restore tasks on this board');
    }

    if (isParentArchived({ board, workspace })) {
      throw new ForbiddenError('Cannot restore task because the board or workspace is archived');
    }

    const restoredTask = await taskRepository.updateTask(taskId, { isArchived: false });

    logger.info(`Task restored from archive successfully`, {
      taskId,
      restoredBy: userId
    });

    return restoredTask;
  }

  /**
   * Checklist operations (add, update, remove checklist items).
   * User must be workspace Member.
   */
  async checklistOperation(taskId, userId, operation) {
    const { task, board, workspace, access } = await this.getValidatedTaskContext(taskId, userId);

    if (!access.canWrite) {
      throw new ForbiddenError('You do not have permission to edit checklist items on this board');
    }

    if (isParentArchived({ board, workspace })) {
      throw new ForbiddenError('Cannot modify checklist because the board or workspace is archived');
    }

    const { action, text, itemId, isDone } = operation;

    if (action === 'add') {
      task.checklist.push({ text, isDone: false });
    } else if (action === 'update') {
      const item = task.checklist.id(itemId);
      if (!item) {
        throw new NotFoundError('Checklist item not found');
      }
      if (text !== undefined) item.text = text;
      if (isDone !== undefined) item.isDone = isDone;
    } else if (action === 'remove') {
      const item = task.checklist.id(itemId);
      if (!item) {
        throw new NotFoundError('Checklist item not found');
      }
      task.checklist.pull(itemId);
    }

    await task.save();

    logger.info(`Checklist updated: ${action}`, {
      taskId,
      updatedBy: userId
    });

    return task;
  }

  /**
   * Add assignee to a task.
   * User must be workspace Member.
   */
  async addAssignee(taskId, userId, assigneeUserId) {
    this.validateId(assigneeUserId, 'assignee user');
    const { task, board, workspace, access } = await this.getValidatedTaskContext(taskId, userId);

    if (!access.canWrite) {
      throw new ForbiddenError('You do not have permission to add assignees on this board');
    }

    if (isParentArchived({ board, workspace })) {
      throw new ForbiddenError('Cannot add assignee because the board or workspace is archived');
    }

    // Verify if assigneeUserId is a member/owner of the workspace
    const isMember = workspace.members.some(
      (m) => m.userId && getStrId(m.userId) === getStrId(assigneeUserId)
    ) || getStrId(workspace.ownerId) === getStrId(assigneeUserId);

    if (!isMember) {
      throw new BadRequestError('Assignee must be a member of this workspace');
    }

    const updatedTask = await taskRepository.addAssignee(taskId, assigneeUserId);

    logger.info(`Assignee added successfully`, {
      taskId,
      assigneeId: assigneeUserId,
      addedBy: userId
    });

    return updatedTask;
  }

  /**
   * Remove assignee from a task.
   * User must be workspace Member.
   */
  async removeAssignee(taskId, userId, assigneeUserId) {
    this.validateId(assigneeUserId, 'assignee user');
    const { task, board, workspace, access } = await this.getValidatedTaskContext(taskId, userId);

    if (!access.canWrite) {
      throw new ForbiddenError('You do not have permission to remove assignees on this board');
    }

    if (isParentArchived({ board, workspace })) {
      throw new ForbiddenError('Cannot remove assignee because the board or workspace is archived');
    }

    // Check if assignee is currently assigned
    const isAssigned = task.assignees.some((uid) => getStrId(uid) === getStrId(assigneeUserId));
    if (!isAssigned) {
      throw new BadRequestError('User is not assigned to this task');
    }

    const updatedTask = await taskRepository.removeAssignee(taskId, assigneeUserId);

    logger.info(`Assignee removed successfully`, {
      taskId,
      assigneeId: assigneeUserId,
      removedBy: userId
    });

    return updatedTask;
  }

  /**
   * Search/filter tasks on a board.
   * User must be workspace Viewer.
   */
  async searchTasks(boardId, userId, queryParams) {
    const { access } = await this.getValidatedParentContext(boardId, userId);

    if (!access.canView) {
      throw new ForbiddenError('You do not have permission to search tasks on this board');
    }

    const filters = {};

    if (queryParams.isArchived === 'true') {
      filters.isArchived = true;
    } else {
      filters.isArchived = false;
    }

    if (queryParams.q) {
      const searchRegex = new RegExp(queryParams.q, 'i');
      filters.$or = [
        { title: searchRegex },
        { description: searchRegex }
      ];
    }

    if (queryParams.listId) {
      this.validateId(queryParams.listId, 'list');
      filters.listId = queryParams.listId;
    }

    if (queryParams.priority) {
      filters.priority = queryParams.priority;
    }

    if (queryParams.assigneeId) {
      this.validateId(queryParams.assigneeId, 'assignee');
      filters.assignees = queryParams.assigneeId;
    }

    if (queryParams.label) {
      const labels = queryParams.label.split(',').map((l) => l.trim());
      filters.labels = { $in: labels };
    }
    
    if (queryParams.dueBefore) {
      const beforeDate = new Date(queryParams.dueBefore);
      if (Number.isNaN(beforeDate.getTime())) {
        throw new BadRequestError('Invalid dueBefore date format');
      }
      filters.dueDate = { $ne: null, $lt: beforeDate };
    }
    return taskRepository.findTasksByBoard(boardId, filters);
  }

  /**
   * Upload an attachment to a task.
   */
  async uploadAttachment(taskId, userId, file) {
    if (!file) {
      throw new BadRequestError('No file uploaded');
    }

    const { task, board, workspace, access } = await this.getValidatedTaskContext(taskId, userId);

    if (!access.canWrite) {
      throw new ForbiddenError('You do not have permission to add attachments on this board');
    }

    if (isParentArchived({ board, workspace })) {
      throw new ForbiddenError('Cannot upload attachment because the board or workspace is archived');
    }

    // Structured path: taskflow/workspaces/{workspaceId}/boards/{boardId}/tasks/{taskId}/filename_timestamp
    const workspaceId = getStrId(workspace._id);
    const boardId = getStrId(board._id);
    const taskIdStr = getStrId(task._id);

    const assetFolder = `taskflow/workspaces/${workspaceId}/boards/${boardId}/tasks/${taskIdStr}`;
    const parsed = path.parse(file.originalname);
    const cleanName = parsed.name.replace(/[^a-zA-Z0-9]/g, '_');
    const publicId = `${cleanName}_${Date.now()}`;

    let uploadResult;
    try {
      uploadResult = await uploadStream(file, {
        asset_folder: assetFolder,
        public_id: publicId
      });
    } catch (err) {
      logger.error('Failed to upload file to Cloudinary', err);
      throw err;
    }

    const attachment = await taskRepository.createAttachment({
      taskId: task._id,
      fileName: file.originalname,
      storageKey: uploadResult.public_id,
      fileUrl: uploadResult.secure_url,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedBy: userId
    });

    task.attachments.push(attachment._id);
    await task.save();

    logger.info(`Attachment uploaded successfully to task: ${task.title}`, {
      taskId,
      attachmentId: attachment._id,
      uploadedBy: userId
    });

    return attachment;
  }

  /**
   * Delete an attachment from a task.
   */
  async deleteAttachment(taskId, attachmentId, userId) {
    this.validateId(attachmentId, 'attachment');
    const { task, board, workspace, access } = await this.getValidatedTaskContext(taskId, userId);

    if (!access.canWrite) {
      throw new ForbiddenError('You do not have permission to delete attachments on this board');
    }

    if (isParentArchived({ board, workspace })) {
      throw new ForbiddenError('Cannot delete attachment because the board or workspace is archived');
    }

    const attachment = await taskRepository.findAttachmentById(attachmentId);
    if (!attachment) {
      throw new NotFoundError('Attachment not found');
    }

    if (getStrId(attachment.taskId) !== getStrId(task._id)) {
      throw new BadRequestError('Attachment does not belong to this task');
    }

    const resourceType = getCloudinaryResourceType(attachment.mimeType);
    try {
      await deleteFromCloudinary(attachment.storageKey, resourceType);
    } catch (err) {
      logger.warn(`Failed to delete resource ${attachment.storageKey} on Cloudinary: ${err.message}. Proceeding with DB cleanup.`);
    }

    await taskRepository.deleteAttachment(attachmentId);

    task.attachments.pull(attachmentId);
    await task.save();

    logger.info(`Attachment deleted successfully from task: ${task.title}`, {
      taskId,
      attachmentId,
      deletedBy: userId
    });
  }

  /**
   * Attach a label to a task.
   */
  async addLabelToTask(taskId, userId, labelId) {
    this.validateId(labelId, 'label');
    const { task, board, workspace, access } = await this.getValidatedTaskContext(taskId, userId);

    if (!access.canWrite) {
      throw new ForbiddenError('You do not have permission to add labels on this board');
    }

    if (isParentArchived({ board, workspace })) {
      throw new ForbiddenError('Cannot add label because the board or workspace is archived');
    }

    // Verify if label exists and belongs to this board
    const label = await mongoose.model('Label').findById(labelId);
    if (!label || label.boardId.toString() !== board._id.toString()) {
      throw new BadRequestError('Label not found or does not belong to this board');
    }

    // Verify if label is already attached
    const isAttached = task.labels.some((lId) => lId.toString() === labelId.toString());
    if (isAttached) {
      throw new BadRequestError('Label is already attached to this task');
    }

    task.labels.push(labelId);
    await task.save();

    logger.info(`Label added to task successfully`, { taskId, labelId, addedBy: userId });
    return task;
  }

  /**
   * Remove a label from a task.
   */
  async removeLabelFromTask(taskId, userId, labelId) {
    this.validateId(labelId, 'label');
    const { task, board, workspace, access } = await this.getValidatedTaskContext(taskId, userId);

    if (!access.canWrite) {
      throw new ForbiddenError('You do not have permission to remove labels on this board');
    }

    if (isParentArchived({ board, workspace })) {
      throw new ForbiddenError('Cannot remove label because the board or workspace is archived');
    }

    // Verify if label is attached
    const isAttached = task.labels.some((lId) => lId.toString() === labelId.toString());
    if (!isAttached) {
      throw new BadRequestError('Label is not attached to this task');
    }

    task.labels.pull(labelId);
    await task.save();

    logger.info(`Label removed from task successfully`, { taskId, labelId, removedBy: userId });
    return task;
  }

  /**
   * Retrieve all active tasks assigned to the current user that they have permissions to view.
   */
  async getAssignedTasks(userId, query = {}) {
    // 1. Get all workspaces user is a member of
    const workspaces = await workspaceRepository.listWorkspacesForUser(userId);
    if (!workspaces || workspaces.length === 0) {
      return [];
    }

    const workspaceIds = workspaces.map((w) => w._id);

    // 2. Fetch all active boards in these workspaces
    const boards = await boardRepository.findActiveBoardsByWorkspaces(workspaceIds);
    if (!boards || boards.length === 0) {
      return [];
    }

    // 3. Filter boards where the user has view permissions
    const workspaceMap = new Map();
    workspaces.forEach((w) => {
      workspaceMap.set(w._id.toString(), w);
    });

    const allowedBoardIds = [];
    for (const board of boards) {
      const workspace = workspaceMap.get(board.workspaceId.toString());
      if (workspace) {
        const role = getWorkspaceRole(workspace, userId);
        if (canViewBoard({ board, userRole: role, userId })) {
          allowedBoardIds.push(board._id);
        }
      }
    }

    if (allowedBoardIds.length === 0) {
      return [];
    }

    // 4. Build filters based on queries
    const filters = {};
    if (query.isArchived === 'true') {
      filters.isArchived = true;
    } else {
      filters.isArchived = false;
    }

    if (query.priority) {
      filters.priority = query.priority;
    }

    if (query.search) {
      filters.$text = { $search: query.search };
    }

    return taskRepository.findAssignedTasks(userId, allowedBoardIds, filters);
  }

  /**
   * Retrieve activity logs for a specific task.
   * User must have view permission on the task.
   */
  async getTaskActivityLogs(taskId, userId, query) {
    const { task, access } = await this.getValidatedTaskContext(taskId, userId);

    if (!access.canView) {
      throw new ForbiddenError('You do not have permission to view this task history');
    }

    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;

    return activityLogService.getTaskActivityLogs(task._id, { page, limit });
  }
}

export default new TaskService();
