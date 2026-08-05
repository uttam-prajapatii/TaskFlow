import mongoose from 'mongoose';
import taskRepository from './task.repository.js';
import listRepository from '../list/list.repository.js';
import boardRepository from '../board/board.repository.js';
import workspaceRepository from '../workspace/workspace.repository.js';
import logger from '../../utils/logger.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors.js';
import { getTaskAccessRights, isParentArchived, formatGroupedTasks, getStrId } from './task.utils.js';

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

    // Auto-calculate position at the end of the list
    const maxPos = await taskRepository.getMaxPosition(listId);
    const position = maxPos + 1;

    const task = await taskRepository.createTask({
      ...taskData,
      listId,
      boardId: list.boardId,
      position,
      createdBy: userId
    });

    logger.info(`Task created successfully: ${task.title}`, {
      taskId: task._id,
      listId,
      boardId: list.boardId,
      createdBy: userId
    });

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

    logger.info(`Task moved successfully`, {
      taskId,
      targetListId: targetListIdStr,
      targetPosition,
      movedBy: userId
    });

    return taskRepository.findTaskById(taskId);
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
}

export default new TaskService();
