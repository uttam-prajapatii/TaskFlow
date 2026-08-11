import commentRepository from './comment.repository.js';
import taskService from '../task/task.service.js';
import notificationService from '../notification/notification.service.js';
import authRepository from '../auth/auth.repository.js';
import { isParentArchived } from '../task/task.utils.js';
import { emitToBoard } from '../../config/socket.js';
import { enqueueEmail } from '../email/email.queue.js';
import { ForbiddenError, NotFoundError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

class CommentService {
  /**
   * Add a new comment to a task and trigger notifications for mentions.
   */
  async addComment(taskId, userId, { body, mentions }) {
    // 1. Retrieve parent board, workspace and validate write access for the user
    const { task, board, workspace, access } = await taskService.getValidatedTaskContext(taskId, userId);

    if (!access.canWrite) {
      throw new ForbiddenError('You do not have permission to post comments on this board');
    }

    if (isParentArchived({ board, workspace })) {
      throw new ForbiddenError('Cannot post comment because the board or workspace is archived');
    }

    // 2. Create the comment database record
    const comment = await commentRepository.createComment({
      taskId,
      authorId: userId,
      body,
      mentions: mentions || []
    });

    // 3. Find comments by task to fetch the populated author/mentions fields for real-time broadcast
    const commentsList = await commentRepository.findCommentsByTask(taskId);
    const populatedComment = commentsList.find(c => c._id.toString() === comment._id.toString());

    // 4. Broadcast the new comment to all active viewers of the board room
    try {
      emitToBoard(board._id.toString(), 'comment:new', populatedComment);
    } catch (wsError) {
      logger.warn(`Failed to broadcast comment:new WebSocket event: ${wsError.message}`);
    }

    // 5. Notify mentioned users
    if (mentions && mentions.length > 0) {
      const authorName = populatedComment.authorId?.fullName || 'A teammate';
      
      for (const mentionedUserId of mentions) {
        // Skip self-mentions
        if (mentionedUserId.toString() === userId.toString()) continue;

        // Verify user is a member/owner of this workspace
        const isWorkspaceMember = workspace.members.some(
          (m) => m.userId && (m.userId._id || m.userId).toString() === mentionedUserId.toString()
        ) || (workspace.ownerId._id || workspace.ownerId).toString() === mentionedUserId.toString();

        if (isWorkspaceMember) {
          // Trigger in-app notification
          const notificationPayload = {
            taskId,
            taskTitle: task.title,
            boardId: board._id.toString(),
            workspaceId: workspace._id.toString(),
            actorName: authorName,
            message: `${authorName} mentioned you in a comment on "${task.title}"`,
            commentSnippet: body.substring(0, 100)
          };

          await notificationService.createAndSendNotification(
            mentionedUserId,
            'task',
            notificationPayload
          );

          // Queue mention email using BullMQ background queues
          try {
            const user = await authRepository.findUserById(mentionedUserId);
            if (user && user.email) {
              const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
              const taskUrl = `${appBaseUrl}/boards/${board._id}/tasks/${taskId}`;

              await enqueueEmail('sendMention', {
                toEmail: user.email,
                mentionedByName: authorName,
                commentSnippet: body.substring(0, 100),
                taskUrl
              });
            }
          } catch (emailErr) {
            logger.error(`Failed to enqueue comment mention email to ${mentionedUserId}: ${emailErr.message}`);
          }
        }
      }
    }

    logger.info(`Comment added successfully: ${comment._id} by user: ${userId}`);
    return populatedComment;
  }

  /**
   * Get all comments for a task.
   */
  async getComments(taskId, userId) {
    // Validate that user can view tasks on this board
    const { access } = await taskService.getValidatedTaskContext(taskId, userId);
    if (!access.canView) {
      throw new ForbiddenError('You do not have permission to view comments on this board');
    }

    return commentRepository.findCommentsByTask(taskId);
  }

  /**
   * Update a task comment.
   * Actor must be the author of the comment.
   */
  async updateComment(taskId, commentId, userId, { body, mentions }) {
    const { board, access } = await taskService.getValidatedTaskContext(taskId, userId);
    if (!access.canWrite) {
      throw new ForbiddenError('You do not have permission to edit comments on this board');
    }

    const comment = await commentRepository.findCommentById(commentId);
    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    if (comment.taskId.toString() !== taskId.toString()) {
      throw new ForbiddenError('Comment does not belong to this task');
    }

    if (comment.authorId.toString() !== userId.toString()) {
      throw new ForbiddenError('Only the author can edit this comment');
    }

    const updatedComment = await commentRepository.updateComment(commentId, {
      body,
      mentions: mentions || comment.mentions
    });

    try {
      emitToBoard(board._id.toString(), 'comment:update', updatedComment);
    } catch (wsError) {
      logger.warn(`Failed to broadcast comment:update WebSocket event: ${wsError.message}`);
    }

    logger.info(`Comment updated successfully: ${commentId} by user: ${userId}`);
    return updatedComment;
  }

  /**
   * Delete a task comment.
   * Actor must be the author, or workspace admin/owner.
   */
  async deleteComment(taskId, commentId, userId) {
    const { board, workspace, access } = await taskService.getValidatedTaskContext(taskId, userId);
    if (!access.canWrite) {
      throw new ForbiddenError('You do not have permission to delete comments on this board');
    }

    const comment = await commentRepository.findCommentById(commentId);
    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    if (comment.taskId.toString() !== taskId.toString()) {
      throw new ForbiddenError('Comment does not belong to this task');
    }

    // Role check: Author, Admin, or Owner
    const isAuthor = comment.authorId.toString() === userId.toString();
    const workspaceRole = workspace.members.find(m => m.userId && (m.userId._id || m.userId).toString() === userId.toString())?.role;
    const isOwnerOrAdmin = (workspace.ownerId._id || workspace.ownerId).toString() === userId.toString() || workspaceRole === 'admin';

    if (!isAuthor && !isOwnerOrAdmin) {
      throw new ForbiddenError('Only the author or a workspace manager can delete this comment');
    }

    await commentRepository.deleteComment(commentId);

    try {
      emitToBoard(board._id.toString(), 'comment:delete', { taskId, commentId });
    } catch (wsError) {
      logger.warn(`Failed to broadcast comment:delete WebSocket event: ${wsError.message}`);
    }

    logger.info(`Comment deleted successfully: ${commentId} by user: ${userId}`);
  }
}

export default new CommentService();
