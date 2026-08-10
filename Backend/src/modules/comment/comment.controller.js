import commentService from './comment.service.js';
import asyncHandler from '../../utils/asyncHandler.js';

class CommentController {
  /**
   * Add a comment to a task.
   */
  addComment = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const userId = req.user._id;
    const comment = await commentService.addComment(taskId, userId, req.body);

    res.status(201).json({
      status: 'success',
      data: comment
    });
  });

  /**
   * Get all comments of a task.
   */
  getComments = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const userId = req.user._id;
    const comments = await commentService.getComments(taskId, userId);

    res.status(200).json({
      status: 'success',
      data: comments
    });
  });

  /**
   * Delete a comment from a task.
   */
  deleteComment = asyncHandler(async (req, res) => {
    const { taskId, commentId } = req.params;
    const userId = req.user._id;
    await commentService.deleteComment(taskId, commentId, userId);

    res.status(204).json({
      status: 'success',
      data: null
    });
  });
}

export default new CommentController();
