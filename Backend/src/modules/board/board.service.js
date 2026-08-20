import mongoose from 'mongoose';
import boardRepository from './board.repository.js';
import workspaceRepository from '../workspace/workspace.repository.js';
import StarredBoard from './starredBoard.model.js';
import logger from '../../utils/logger.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors.js';
import { emitToWorkspace } from '../../config/socket.js';
import {
  getWorkspaceRole,
  isWorkspaceAdmin,
  isWorkspaceMember,
  isWorkspaceViewer,
  canViewBoard,
  canUpdateBoard
} from './board.utils.js';

class BoardService {
  /**
   * Helper to validate ObjectId format.
   */
  validateId(id, label) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError(`Invalid ${label} ID format`);
    }
  }

  async getValidatedWorkspace(workspaceId) {
    const workspace = await workspaceRepository.findWorkspaceByIdOrSlug(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }
    return workspace;
  }

  /**
   * Create a new board in a workspace.
   * Creator must be Member, Admin, or Owner.
   */
  async createBoard(workspaceId, userId, boardData) {
    const workspace = await this.getValidatedWorkspace(workspaceId);

    // If workspace is archived, block all mutations
    if (workspace.isArchived) {
      throw new ForbiddenError('Cannot create board because the workspace is archived');
    }

    const role = getWorkspaceRole(workspace, userId);
    if (!isWorkspaceMember(role)) {
      throw new ForbiddenError('Only workspace members or admins can create a board');
    }

    // Check board name uniqueness within the workspace (including archived boards)
    const existingBoard = await boardRepository.findBoardByWorkspaceAndName(workspace._id, boardData.name);
    if (existingBoard) {
      throw new BadRequestError('A board with this name already exists in the workspace');
    }

    const board = await boardRepository.createBoard({
      ...boardData,
      workspaceId: workspace._id,
      createdBy: userId
    });

    logger.info(`Board created successfully: ${board.name}`, {
      boardId: board._id,
      workspaceId: workspace._id,
      createdBy: userId
    });

    try {
      emitToWorkspace(workspace._id.toString(), 'board:created', board);
    } catch (wsError) {
      logger.warn(`Failed to broadcast board:created Socket event: ${wsError.message}`);
    }

    return board;
  }

  /**
   * List active/archived boards in a workspace.
   * User must be at least a Viewer in the workspace.
   */
  async listBoards(workspaceId, userId, query) {
    const workspace = await this.getValidatedWorkspace(workspaceId);

    const role = getWorkspaceRole(workspace, userId);
    if (!isWorkspaceViewer(role)) {
      throw new ForbiddenError('You do not have access to this workspace');
    }

    const page = query.page ? Number.parseInt(query.page, 10) : 1;
    const limit = query.limit ? Number.parseInt(query.limit, 10) : 10;

    if (Number.isNaN(page) || page < 1) {
      throw new BadRequestError('Page number must be a positive integer');
    }
    if (Number.isNaN(limit) || limit < 1 || limit > 100) {
      throw new BadRequestError('Limit must be a positive integer between 1 and 100');
    }

    const filters = {};
    if (query.includeArchived !== 'true') {
      filters.isArchived = false;
    }

    // Apply private board visibility constraints
    if (!isWorkspaceAdmin(role)) {
      filters.$or = [
        { visibility: 'workspace' },
        { createdBy: userId }
      ];
    }

    const [result, starred] = await Promise.all([
      boardRepository.listBoards(workspace._id, filters, { page, limit }),
      StarredBoard.find({ userId }).select('boardId').lean().exec()
    ]);

    const starredIds = new Set(starred.map((s) => s.boardId.toString()));

    if (Array.isArray(result)) {
      return result.map((b) => {
        const obj = typeof b.toObject === 'function' ? b.toObject() : b;
        obj.isStarred = starredIds.has((b._id || b.id).toString());
        return obj;
      });
    }

    if (result.boards) {
      result.boards = result.boards.map((b) => {
        const obj = typeof b.toObject === 'function' ? b.toObject() : b;
        obj.isStarred = starredIds.has((b._id || b.id).toString());
        return obj;
      });
    }

    return result;
  }

  /**
   * Get details of a single board.
   * User must be a member of the workspace and authorized for private visibility.
   */
  async getBoardDetails(boardId, userId) {
    this.validateId(boardId, 'board');
    const board = await boardRepository.findBoardById(boardId);
    if (!board) {
      throw new NotFoundError('Board not found');
    }

    const workspace = await workspaceRepository.findWorkspaceById(board.workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const role = getWorkspaceRole(workspace, userId);
    if (!isWorkspaceViewer(role)) {
      throw new ForbiddenError('You do not have access to this workspace');
    }

    if (!canViewBoard({ board, userRole: role, userId })) {
      throw new ForbiddenError('You do not have access to this private board');
    }

    const isStarred = await StarredBoard.exists({ userId, boardId: board._id });
    const boardObj = board.toObject();
    boardObj.isStarred = !!isStarred;

    return boardObj;
  }

  /**
   * Update board details (name, description, visibility).
   * User must be board Creator (Member role) or Admin/Owner.
   */
  async updateBoard(boardId, userId, updateData) {
    this.validateId(boardId, 'board');
    const board = await boardRepository.findBoardById(boardId);
    if (!board) {
      throw new NotFoundError('Board not found');
    }

    const workspace = await workspaceRepository.findWorkspaceById(board.workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    // Block operations if workspace is archived
    if (workspace.isArchived) {
      throw new ForbiddenError('Cannot update board because the workspace is archived');
    }

    // Block update if board itself is archived
    if (board.isArchived) {
      throw new BadRequestError('Cannot update board details because the board is archived. Please restore it first');
    }

    const role = getWorkspaceRole(workspace, userId);
    if (!canUpdateBoard({ board, userRole: role, userId })) {
      throw new ForbiddenError('You do not have permission to update this board');
    }

    // Check board name uniqueness if it's being changed
    if (updateData.name && updateData.name.trim().toLowerCase() !== board.name.toLowerCase()) {
      const existingBoard = await boardRepository.findBoardByWorkspaceAndName(board.workspaceId, updateData.name);
      if (existingBoard) {
        throw new BadRequestError('A board with this name already exists in the workspace');
      }
    }

    const allowedUpdates = {};
    if (updateData.name !== undefined) {
      allowedUpdates.name = updateData.name;
    }
    if (updateData.description !== undefined) {
      allowedUpdates.description = updateData.description;
    }
    if (updateData.visibility !== undefined) {
      allowedUpdates.visibility = updateData.visibility;
    }

    const updatedBoard = await boardRepository.updateBoard(boardId, allowedUpdates);

    logger.info(`Board updated successfully: ${updatedBoard.name}`, {
      boardId,
      updatedBy: userId,
      updatedFields: Object.keys(allowedUpdates)
    });

    try {
      emitToWorkspace(updatedBoard.workspaceId.toString(), 'board:updated', updatedBoard);
    } catch (wsError) {
      logger.warn(`Failed to broadcast board:updated Socket event: ${wsError.message}`);
    }

    return updatedBoard;
  }

  /**
   * Archive a board.
   * Creator/Inviter must be Admin or Owner.
   */
  async archiveBoard(boardId, userId) {
    this.validateId(boardId, 'board');
    const board = await boardRepository.findBoardById(boardId);
    if (!board) {
      throw new NotFoundError('Board not found');
    }

    const workspace = await workspaceRepository.findWorkspaceById(board.workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    // Block operations if workspace is archived
    if (workspace.isArchived) {
      throw new ForbiddenError('Cannot archive board because the workspace is archived');
    }

    const role = getWorkspaceRole(workspace, userId);
    if (!isWorkspaceAdmin(role)) {
      throw new ForbiddenError('Only workspace admins or owners can archive boards');
    }

    const updatedBoard = await boardRepository.updateBoard(boardId, { isArchived: true });

    logger.info(`Board archived successfully`, { boardId, archivedBy: userId });

    try {
      emitToWorkspace(updatedBoard.workspaceId.toString(), 'board:updated', updatedBoard);
    } catch (wsError) {
      logger.warn(`Failed to broadcast board:updated Socket event: ${wsError.message}`);
    }

    return updatedBoard;
  }

  /**
   * Restore an archived board.
   * Creator/Inviter must be Admin or Owner.
   */
  async restoreBoard(boardId, userId) {
    this.validateId(boardId, 'board');
    const board = await boardRepository.findBoardById(boardId);
    if (!board) {
      throw new NotFoundError('Board not found');
    }

    const workspace = await workspaceRepository.findWorkspaceById(board.workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    // Block operations if workspace is archived
    if (workspace.isArchived) {
      throw new ForbiddenError('Cannot restore board because the workspace is archived');
    }

    const role = getWorkspaceRole(workspace, userId);
    if (!isWorkspaceAdmin(role)) {
      throw new ForbiddenError('Only workspace admins or owners can restore boards');
    }

    const updatedBoard = await boardRepository.updateBoard(boardId, { isArchived: false });

    logger.info(`Board restored successfully`, { boardId, restoredBy: userId });

    try {
      emitToWorkspace(updatedBoard.workspaceId.toString(), 'board:updated', updatedBoard);
    } catch (wsError) {
      logger.warn(`Failed to broadcast board:updated Socket event: ${wsError.message}`);
    }

    return updatedBoard;
  }

  /**
   * Soft delete a board.
   * Creator/Inviter must be Admin or Owner.
   */
  async softDeleteBoard(boardId, userId) {
    this.validateId(boardId, 'board');
    const board = await boardRepository.findBoardById(boardId);
    if (!board) {
      throw new NotFoundError('Board not found');
    }

    const workspace = await workspaceRepository.findWorkspaceById(board.workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    // Block operations if workspace is archived
    if (workspace.isArchived) {
      throw new ForbiddenError('Cannot delete board because the workspace is archived');
    }

    const role = getWorkspaceRole(workspace, userId);
    if (!isWorkspaceAdmin(role)) {
      throw new ForbiddenError('Only workspace admins or owners can delete boards');
    }

    await boardRepository.softDeleteBoard(boardId);

    logger.info(`Board soft deleted successfully`, { boardId, deletedBy: userId });

    try {
      emitToWorkspace(board.workspaceId.toString(), 'board:deleted', { boardId });
    } catch (wsError) {
      logger.warn(`Failed to broadcast board:deleted Socket event: ${wsError.message}`);
    }
  }

  /**
   * Star a board.
   */
  async starBoard(boardId, userId) {
    this.validateId(boardId, 'board');
    const board = await boardRepository.findBoardById(boardId);
    if (!board) {
      throw new NotFoundError('Board not found');
    }

    const workspace = await workspaceRepository.findWorkspaceById(board.workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const role = getWorkspaceRole(workspace, userId);
    if (!isWorkspaceViewer(role)) {
      throw new ForbiddenError('You do not have access to this workspace');
    }

    // Upsert StarredBoard entry to prevent duplicates
    await StarredBoard.findOneAndUpdate(
      { userId, boardId: board._id },
      { userId, boardId: board._id },
      { upsert: true, new: true }
    ).exec();

    logger.info(`Board starred by user`, { boardId, userId });
  }

  /**
   * Unstar a board.
   */
  async unstarBoard(boardId, userId) {
    this.validateId(boardId, 'board');
    await StarredBoard.findOneAndDelete({ userId, boardId }).exec();
    logger.info(`Board unstarred by user`, { boardId, userId });
  }
}

export default new BoardService();
