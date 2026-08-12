import mongoose from 'mongoose';
import labelRepository from './label.repository.js';
import boardRepository from '../board/board.repository.js';
import workspaceRepository from '../workspace/workspace.repository.js';
import { Task } from '../task/task.model.js';
import { getTaskAccessRights, isParentArchived } from '../task/task.utils.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

class LabelService {
  /**
   * Helper to validate ObjectId.
   */
  validateId(id, type) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError(`Invalid ${type} ID format`);
    }
  }

  /**
   * Helper to validate parent context (board and workspace access).
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
   * Create a new custom label for a board.
   */
  async createLabel(boardId, userId, { name, color }) {
    const { board, workspace, access } = await this.getValidatedParentContext(boardId, userId);

    if (!access.canWrite) {
      throw new ForbiddenError('You do not have permission to create labels on this board');
    }

    if (isParentArchived({ board, workspace })) {
      throw new ForbiddenError('Cannot create label because the board or workspace is archived');
    }

    // Uniqueness check
    const existing = await labelRepository.findLabelByNameAndBoard(name, board._id);
    if (existing) {
      throw new BadRequestError(`A label with name "${name}" already exists on this board`);
    }

    const label = await labelRepository.createLabel({
      boardId: board._id,
      name,
      color: color || '#4F46E5'
    });

    logger.info(`Label created successfully: ${name}`, { labelId: label._id, boardId: board._id, createdBy: userId });
    return label;
  }

  /**
   * List all labels on a board.
   */
  async getLabels(boardId, userId) {
    const { access } = await this.getValidatedParentContext(boardId, userId);

    if (!access.canView) {
      throw new ForbiddenError('You do not have permission to view labels on this board');
    }

    return labelRepository.findLabelsByBoard(boardId);
  }

  /**
   * Update a label's details.
   */
  async updateLabel(labelId, userId, updateData) {
    this.validateId(labelId, 'label');

    const label = await labelRepository.findLabelById(labelId);
    if (!label) {
      throw new NotFoundError('Label not found');
    }

    const { board, workspace, access } = await this.getValidatedParentContext(label.boardId, userId);

    if (!access.canWrite) {
      throw new ForbiddenError('You do not have permission to update labels on this board');
    }

    if (isParentArchived({ board, workspace })) {
      throw new ForbiddenError('Cannot update label because the board or workspace is archived');
    }

    if (updateData.name && updateData.name.trim().toLowerCase() !== label.name.toLowerCase()) {
      const existing = await labelRepository.findLabelByNameAndBoard(updateData.name, label.boardId);
      if (existing) {
        throw new BadRequestError(`A label with name "${updateData.name}" already exists on this board`);
      }
    }

    const updated = await labelRepository.updateLabel(labelId, updateData);
    logger.info(`Label updated: ${labelId}`, { updatedFields: Object.keys(updateData), updatedBy: userId });
    return updated;
  }

  /**
   * Delete a label and clean up all task associations on the board.
   */
  async deleteLabel(labelId, userId) {
    this.validateId(labelId, 'label');

    const label = await labelRepository.findLabelById(labelId);
    if (!label) {
      throw new NotFoundError('Label not found');
    }

    const { board, workspace, access } = await this.getValidatedParentContext(label.boardId, userId);

    if (!access.canWrite) {
      throw new ForbiddenError('You do not have permission to delete labels on this board');
    }

    if (isParentArchived({ board, workspace })) {
      throw new ForbiddenError('Cannot delete label because the board or workspace is archived');
    }

    // Cascade delete: Pull labelId from all task documents on the board
    await Task.updateMany(
      { boardId: board._id, labels: labelId },
      { $pull: { labels: labelId } }
    );

    await labelRepository.deleteLabel(labelId);
    logger.info(`Label deleted and task associations cleaned up: ${labelId}`, { deletedBy: userId });
  }
}

export default new LabelService();
