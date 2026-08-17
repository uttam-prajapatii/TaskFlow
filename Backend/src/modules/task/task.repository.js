import { Task } from './task.model.js';
import { TaskAttachment } from './taskAttachment.model.js';

class TaskRepository {
  /**
   * Create a new task.
   */
  async createTask(taskData) {
    return Task.create(taskData);
  }

  /**
   * Find an active (non-deleted) task by ID.
   */
  async findTaskById(id) {
    return Task.findOne({ _id: id, isDeleted: { $ne: true } }).exec();
  }

  /**
   * Find an active task by ID and populate user relations.
   */
  async findTaskByIdPopulated(id) {
    return Task.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate('assignees', 'fullName email')
      .populate('createdBy', 'fullName email')
      .populate('labels')
      .populate('attachments')
      .exec();
  }

  /**
   * Find all active tasks in a list, sorted by position.
   */
  async findTasksByList(listId) {
    return Task.find({ listId, isDeleted: { $ne: true } })
      .sort({ position: 1 })
      .exec();
  }

  /**
   * Find all active tasks in a board, with optional filters, sorted by position.
   */
  async findTasksByBoard(boardId, filters = {}) {
    return Task.find({ boardId, isDeleted: { $ne: true }, ...filters })
      .populate('assignees', 'fullName email')
      .populate('createdBy', 'fullName email')
      .populate('labels')
      .sort({ listId: 1, position: 1 })
      .exec();
  }

  /**
   * Get the maximum position among active tasks in a list.
   */
  async getMaxPosition(listId) {
    const lastTask = await Task.findOne({ listId, isDeleted: { $ne: true } })
      .sort({ position: -1 })
      .exec();
    return lastTask ? lastTask.position : -1;
  }

  /**
   * Update task fields.
   */
  async updateTask(id, updateData) {
    return Task.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      updateData,
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Soft-delete a task.
   */
  async softDeleteTask(id) {
    return Task.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { isDeleted: true, deletedAt: Date.now() },
      { new: true }
    ).exec();
  }

  /**
   * Bulk-update positions of tasks.
   */
  async updatePositions(taskIdsInOrder) {
    if (!taskIdsInOrder || taskIdsInOrder.length === 0) return;

    const bulkOps = taskIdsInOrder.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { position: index } }
      }
    }));

    await Task.bulkWrite(bulkOps);
  }

  /**
   * Add an assignee to a task.
   */
  async addAssignee(taskId, userId) {
    return Task.findOneAndUpdate(
      { _id: taskId, isDeleted: { $ne: true } },
      { $addToSet: { assignees: userId } },
      { new: true }
    ).exec();
  }

  /**
   * Remove an assignee from a task.
   */
  async removeAssignee(taskId, userId) {
    return Task.findOneAndUpdate(
      { _id: taskId, isDeleted: { $ne: true } },
      { $pull: { assignees: userId } },
      { new: true }
    ).exec();
  }

  /**
   * Create a new task attachment.
   */
  async createAttachment(attachmentData) {
    return TaskAttachment.create(attachmentData);
  }

  /**
   * Find a task attachment by ID.
   */
  async findAttachmentById(id) {
    return TaskAttachment.findById(id).exec();
  }

  /**
   * Hard-delete a task attachment.
   */
  async deleteAttachment(id) {
    return TaskAttachment.findByIdAndDelete(id).exec();
  }

  /**
   * Find tasks assigned to a specific user on allowed boards.
   */
  async findAssignedTasks(userId, allowedBoardIds, filters = {}) {
    const query = {
      assignees: userId,
      boardId: { $in: allowedBoardIds },
      isDeleted: { $ne: true },
      ...filters
    };
    return Task.find(query)
      .populate('assignees', 'fullName email avatarUrl')
      .populate('createdBy', 'fullName email avatarUrl')
      .populate({
        path: 'boardId',
        select: 'name workspaceId',
        populate: { path: 'workspaceId', select: 'name color logoUrl slug' }
      })
      .populate('listId', 'name')
      .populate('labels')
      .sort({ dueDate: 1, createdAt: -1 })
      .exec();
  }

  /**
   * Find tasks created by a specific user on allowed boards.
   */
  async findCreatedTasks(userId, allowedBoardIds, filters = {}) {
    const query = {
      createdBy: userId,
      boardId: { $in: allowedBoardIds },
      isDeleted: { $ne: true },
      ...filters
    };
    return Task.find(query)
      .populate('assignees', 'fullName email avatarUrl')
      .populate('createdBy', 'fullName email avatarUrl')
      .populate({
        path: 'boardId',
        select: 'name workspaceId',
        populate: { path: 'workspaceId', select: 'name' }
      })
      .populate('listId', 'name')
      .populate('labels')
      .sort({ createdAt: -1 })
      .exec();
  }
}

export default new TaskRepository();
