import { Comment } from './comment.model.js';

class CommentRepository {
  /**
   * Create a new comment.
   */
  async createComment(data) {
    return Comment.create(data);
  }

  /**
   * Retrieve comments for a task, sorted from oldest to newest.
   * Populates details for author and mentions.
   */
  async findCommentsByTask(taskId) {
    return Comment.find({ taskId })
      .sort({ createdAt: 1 })
      .populate('authorId', '_id fullName email')
      .populate('mentions', '_id fullName email')
      .lean();
  }

  /**
   * Find a comment by its ID.
   */
  async findCommentById(id) {
    return Comment.findById(id);
  }

  /**
   * Delete a comment by its ID.
   */
  async deleteComment(id) {
    return Comment.deleteOne({ _id: id });
  }

  /**
   * Update a comment by its ID.
   */
  async updateComment(id, data) {
    return Comment.findByIdAndUpdate(id, data, { new: true })
      .populate('authorId', '_id fullName email')
      .populate('mentions', '_id fullName email')
      .lean();
  }

  /**
   * Delete all comments of a specific task.
   */
  async deleteCommentsByTask(taskId) {
    return Comment.deleteMany({ taskId });
  }
}

export default new CommentRepository();
