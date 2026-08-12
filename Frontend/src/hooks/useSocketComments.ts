import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../lib/socket';
import useAuth from './useAuth';
import type { Comment } from '../services/comment.service';

export const useSocketComments = (boardId?: string, taskId?: string) => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated || !boardId) return;

    const socket = getSocket();

    // Join board room on backend to receive board room events
    socket.emit('board:join', boardId);

    const handleNewComment = (comment: Comment) => {
      const commentTaskId = typeof comment.taskId === 'object' && comment.taskId !== null
        ? (comment.taskId as { _id?: string })._id || String(comment.taskId)
        : String(comment.taskId);

      if (!taskId || commentTaskId === taskId) {
        queryClient.invalidateQueries({ queryKey: ['comments', commentTaskId] });
      }
    };

    const handleUpdateComment = (comment: Comment) => {
      const commentTaskId = typeof comment.taskId === 'object' && comment.taskId !== null
        ? (comment.taskId as { _id?: string })._id || String(comment.taskId)
        : String(comment.taskId);

      if (!taskId || commentTaskId === taskId) {
        queryClient.invalidateQueries({ queryKey: ['comments', commentTaskId] });
      }
    };

    const handleDeleteComment = ({ taskId: deletedTaskId }: { taskId: string; commentId: string }) => {
      if (!taskId || deletedTaskId === taskId) {
        queryClient.invalidateQueries({ queryKey: ['comments', deletedTaskId] });
      }
    };

    socket.on('comment:new', handleNewComment);
    socket.on('comment:update', handleUpdateComment);
    socket.on('comment:delete', handleDeleteComment);

    return () => {
      socket.off('comment:new', handleNewComment);
      socket.off('comment:update', handleUpdateComment);
      socket.off('comment:delete', handleDeleteComment);
    };
  }, [isAuthenticated, boardId, taskId, queryClient]);
};

export default useSocketComments;
