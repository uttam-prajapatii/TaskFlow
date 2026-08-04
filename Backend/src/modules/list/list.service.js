import mongoose from 'mongoose';
import listRepository from './list.repository.js';
import boardRepository from '../board/board.repository.js';
import workspaceRepository from '../workspace/workspace.repository.js';
import { Task } from '../task/task.model.js';
import logger from '../../utils/logger.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors.js';
import { getListAccessRights, isParentArchived } from './list.utils.js';

class ListService {
  /**
   * Helper to validate ObjectId format.
   */
  validateId(id, label) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError(`Invalid ${label} ID format`);
    }
  }

  /**
   * Helper to retrieve and validate parent board and workspace.
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

    const access = getListAccessRights({ board, workspace, userId });
    return { board, workspace, access };
  }

  /**
   * Create a new list (column) in a board.
   * Creator must be a Member of the workspace.
   */
  async createList(boardId, userId, listData) {
    const { board, workspace, access } = await this.getValidatedParentContext(boardId, userId);

    if (!access.canWrite) {
      throw new ForbiddenError('You do not have permission to create a list on this board');
    }

    if (isParentArchived({ board, workspace })) {
      throw new ForbiddenError('Cannot create a list because the board or workspace is archived');
    }

    // List name must be unique within the board (excluding soft-deleted lists)
    const existingList = await listRepository.findListByBoardAndName(boardId, listData.name);
    if (existingList) {
      throw new BadRequestError('A list with this name already exists on this board');
    }

    // Auto-calculate position if not provided
    let position = listData.position;
    if (position === undefined) {
      const maxPos = await listRepository.getMaxPosition(boardId);
      position = maxPos + 1;
    }

    const list = await listRepository.createList({
      ...listData,
      boardId,
      position
    });

    // Append list ID to parent board's listOrder
    await boardRepository.updateBoard(boardId, {
      $push: { listOrder: list._id }
    });

    logger.info(`List created successfully: ${list.name}`, {
      listId: list._id,
      boardId,
      createdBy: userId
    });

    return list;
  }

  /**
   * Get all active lists of a board.
   * User must be a workspace Viewer.
   */
  async getLists(boardId, userId) {
    const { access } = await this.getValidatedParentContext(boardId, userId);

    if (!access.canView) {
      throw new ForbiddenError('You do not have permission to view this board');
    }

    return listRepository.findListsByBoard(boardId);
  }

  /**
   * Rename a list.
   * User must be a workspace Member.
   */
  async renameList(listId, userId, name) {
    this.validateId(listId, 'list');

    const list = await listRepository.findListById(listId);
    if (!list) {
      throw new NotFoundError('List not found');
    }

    const { board, workspace, access } = await this.getValidatedParentContext(list.boardId, userId);

    if (!access.canWrite) {
      throw new ForbiddenError('You do not have permission to rename lists on this board');
    }

    if (isParentArchived({ board, workspace })) {
      throw new ForbiddenError('Cannot rename the list because the board or workspace is archived');
    }

    // Unique list name check within the board (excluding soft-deleted lists)
    if (name.trim().toLowerCase() !== list.name.toLowerCase()) {
      const existingList = await listRepository.findListByBoardAndName(list.boardId, name);
      if (existingList) {
        throw new BadRequestError('A list with this name already exists on this board');
      }
    }

    const updatedList = await listRepository.updateList(listId, { name });

    logger.info(`List renamed successfully: ${updatedList.name}`, {
      listId,
      updatedBy: userId
    });

    return updatedList;
  }

  /**
   * Reorder a list to a target position.
   * User must be a workspace Member.
   */
  async reorderList(listId, userId, targetPosition) {
    this.validateId(listId, 'list');

    const list = await listRepository.findListById(listId);
    if (!list) {
      throw new NotFoundError('List not found');
    }

    const { board, workspace, access } = await this.getValidatedParentContext(list.boardId, userId);

    if (!access.canWrite) {
      throw new ForbiddenError('You do not have permission to reorder lists on this board');
    }

    if (isParentArchived({ board, workspace })) {
      throw new ForbiddenError('Cannot reorder list because the board or workspace is archived');
    }

    // Fetch all active lists sorted by current position
    const activeLists = await listRepository.findListsByBoard(list.boardId);

    // Remove target list from current sequence
    const listIndex = activeLists.findIndex((l) => l._id.toString() === listId.toString());
    if (listIndex === -1) {
      throw new NotFoundError('List not found in board list sequence');
    }

    const [targetList] = activeLists.splice(listIndex, 1);

    // Ensure target position is within bounds
    const safePosition = Math.max(0, Math.min(targetPosition, activeLists.length));

    // Insert target list at safePosition
    activeLists.splice(safePosition, 0, targetList);

    // Bulk update positions in database
    const listIds = activeLists.map((l) => l._id);
    await listRepository.updatePositions(listIds);

    // Update parent board's listOrder to match this sequence
    await boardRepository.updateBoard(list.boardId, { listOrder: listIds });

    logger.info(`List reordered successfully`, {
      listId,
      targetPosition: safePosition,
      updatedBy: userId
    });

    // Return the updated list details
    return listRepository.findListById(listId);
  }

  /**
   * Delete a list.
   * User must be workspace Member/Admin.
   */
  async deleteList(listId, userId) {
    this.validateId(listId, 'list');

    const list = await listRepository.findListById(listId);
    if (!list) {
      throw new NotFoundError('List not found');
    }

    const { board, workspace, access } = await this.getValidatedParentContext(list.boardId, userId);

    if (!access.canWrite) {
      throw new ForbiddenError('You do not have permission to delete lists on this board');
    }

    if (isParentArchived({ board, workspace })) {
      throw new ForbiddenError('Cannot delete list because the board or workspace is archived');
    }

    // 1. Soft-delete the list
    await listRepository.softDeleteList(listId);

    // 2. Soft-delete all tasks inside this list
    await Task.updateMany(
      { listId, isDeleted: { $ne: true } },
      { isDeleted: true, deletedAt: Date.now() }
    );

    // 3. Remove the list's ID from the parent board's listOrder
    await boardRepository.updateBoard(list.boardId, {
      $pull: { listOrder: listId }
    });

    logger.info(`List soft-deleted successfully`, {
      listId,
      deletedBy: userId
    });
  }
}

export default new ListService();
