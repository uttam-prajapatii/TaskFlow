import { Board } from './board.model.js';

class BoardRepository {
  /**
   * Create a new board.
   */
  async createBoard(boardData) {
    return Board.create(boardData);
  }

  /**
   * Find an active (non-deleted) board by ID.
   */
  async findBoardById(id) {
    return Board.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate('createdBy', 'fullName email')
      .populate('listOrder')
      .exec();
  }

  /**
   * Find an active (non-deleted) board in a workspace by name.
   */
  async findBoardByWorkspaceAndName(workspaceId, name) {
    return Board.findOne({
      workspaceId,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      isDeleted: { $ne: true }
    }).exec();
  }

  /**
   * List boards in a workspace.
   * Filters out deleted boards.
   */
  async listBoards(workspaceId, filters = {}, options = {}) {
    const query = {
      workspaceId,
      isDeleted: { $ne: true },
      ...filters
    };

    const { page, limit } = options;

    if (page === undefined || limit === undefined) {
      return Board.find(query)
        .populate('createdBy', 'fullName email')
        .sort({ createdAt: -1 })
        .exec();
    }

    const skip = (page - 1) * limit;
    const totalItems = await Board.countDocuments(query);

    const boards = await Board.find(query)
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return {
      boards,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        limit
      }
    };
  }

  /**
   * Update board data.
   */
  async updateBoard(id, updateData) {
    return Board.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      updateData,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'fullName email')
      .populate('listOrder')
      .exec();
  }

  /**
   * Soft delete a board.
   */
  async softDeleteBoard(id) {
    return Board.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { isDeleted: true },
      { new: true }
    ).exec();
  }

  /**
   * Soft delete all boards in a workspace.
   */
  async softDeleteBoardsByWorkspace(workspaceId) {
    return Board.updateMany(
      { workspaceId, isDeleted: { $ne: true } },
      { isDeleted: true }
    ).exec();
  }

  /**
   * Find active boards in multiple workspaces.
   */
  async findActiveBoardsByWorkspaces(workspaceIds) {
    return Board.find({
      workspaceId: { $in: workspaceIds },
      isDeleted: { $ne: true }
    }).exec();
  }
}

export default new BoardRepository();
