import { List } from './list.model.js';

class ListRepository {
  /**
   * Create a new list.
   */
  async createList(listData) {
    return List.create(listData);
  }

  /**
   * Find an active (non-deleted) list by ID.
   */
  async findListById(id) {
    return List.findOne({ _id: id, isDeleted: { $ne: true } }).exec();
  }

  /**
   * Find an active (non-deleted) list on a board by name.
   * Useful for name uniqueness check.
   */
  async findListByBoardAndName(boardId, name) {
    return List.findOne({
      boardId,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      isDeleted: { $ne: true }
    }).exec();
  }

  /**
   * List all active lists on a board, sorted by position.
   */
  async findListsByBoard(boardId) {
    return List.find({ boardId, isDeleted: { $ne: true } })
      .sort({ position: 1 })
      .exec();
  }

  /**
   * Get the maximum position among active lists on a board.
   */
  async getMaxPosition(boardId) {
    const lastList = await List.findOne({ boardId, isDeleted: { $ne: true } })
      .sort({ position: -1 })
      .exec();
    return lastList ? lastList.position : -1;
  }

  /**
   * Update list details.
   */
  async updateList(id, updateData) {
    return List.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      updateData,
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Soft delete a list.
   */
  async softDeleteList(id) {
    return List.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { isDeleted: true, deletedAt: Date.now() },
      { new: true }
    ).exec();
  }

  /**
   * Bulk update list positions.
   */
  async updatePositions(listIdsInOrder) {
    if (!listIdsInOrder || listIdsInOrder.length === 0) return;

    const bulkOps = listIdsInOrder.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { position: index } }
      }
    }));

    await List.bulkWrite(bulkOps);
  }
}

export default new ListRepository();
