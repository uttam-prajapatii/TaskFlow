import api from './api';

export interface CommentAuthor {
  _id: string;
  fullName: string;
  email: string;
}

export interface CommentMention {
  _id: string;
  fullName: string;
  email: string;
}

export interface Comment {
  _id: string;
  taskId: string;
  authorId: CommentAuthor | string;
  body: string;
  mentions?: (CommentMention | string)[];
  createdAt: string;
}

export interface CreateCommentPayload {
  body: string;
  mentions?: string[];
}

export interface UpdateCommentPayload {
  body: string;
  mentions?: string[];
}

export const commentService = {
  // Get all comments for a task
  async getComments(taskId: string): Promise<Comment[]> {
    const response = await api.get(`/api/v1/tasks/${taskId}/comments`);
    return response.data?.data || [];
  },

  // Add a comment to a task
  async addComment(taskId: string, payload: CreateCommentPayload): Promise<Comment> {
    const response = await api.post(`/api/v1/tasks/${taskId}/comments`, payload);
    return response.data?.data;
  },

  // Edit/update a comment
  async updateComment(taskId: string, commentId: string, payload: UpdateCommentPayload): Promise<Comment> {
    const response = await api.patch(`/api/v1/tasks/${taskId}/comments/${commentId}`, payload);
    return response.data?.data;
  },

  // Delete a comment
  async deleteComment(taskId: string, commentId: string): Promise<void> {
    await api.delete(`/api/v1/tasks/${taskId}/comments/${commentId}`);
  },
};

export default commentService;
