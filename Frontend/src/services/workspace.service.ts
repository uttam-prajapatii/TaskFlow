import api from './api';
import type {
  Workspace,
  WorkspaceMember,
  WorkspaceInvite,
  WorkspaceInviteDetails,
  CreateWorkspacePayload,
  UpdateWorkspacePayload,
  InviteMemberPayload,
  WorkspaceAnalytics,
  ActivityLogsResponse,
} from '../features/workspace/types';

export const workspaceService = {
  // Get list of workspaces for the logged in user
  async listWorkspaces(page = 1, limit = 20): Promise<Workspace[]> {
    const response = await api.get('/api/v1/workspaces', {
      params: { page, limit, view: 'full' },
    });
    // Response standard wrapper: { success: true, message: '...', data: [...] } or { data: { workspaces: [...] } }
    const resData = response.data?.data;
    if (Array.isArray(resData)) {
      return resData;
    }
    if (resData?.workspaces && Array.isArray(resData.workspaces)) {
      return resData.workspaces;
    }
    return [];
  },

  // Create a new workspace
  async createWorkspace(payload: CreateWorkspacePayload): Promise<Workspace> {
    const response = await api.post('/api/v1/workspaces', payload);
    return response.data?.data;
  },

  // Get details of a single workspace
  async getWorkspaceDetails(workspaceId: string): Promise<Workspace> {
    const response = await api.get(`/api/v1/workspaces/${workspaceId}`);
    return response.data?.data;
  },

  // Update workspace info
  async updateWorkspace(workspaceId: string, payload: UpdateWorkspacePayload): Promise<Workspace> {
    const response = await api.patch(`/api/v1/workspaces/${workspaceId}`, payload);
    return response.data?.data;
  },

  // Soft delete workspace
  async deleteWorkspace(workspaceId: string): Promise<void> {
    await api.delete(`/api/v1/workspaces/${workspaceId}`);
  },

  // List members of a workspace
  async listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const response = await api.get(`/api/v1/workspaces/${workspaceId}/members`);
    return response.data?.data || [];
  },

  // Search workspace members for mention autocomplete
  async searchMembers(
    workspaceId: string,
    q = '',
    limit = 20,
    page = 1
  ): Promise<{ _id: string; name: string; email: string; avatar?: string | null }[]> {
    const response = await api.get(`/api/v1/workspaces/${workspaceId}/members/search`, {
      params: { q, limit, page },
    });
    return response.data?.data || [];
  },

  // Invite member to workspace
  async inviteMember(workspaceId: string, payload: InviteMemberPayload): Promise<WorkspaceInvite> {
    const response = await api.post(`/api/v1/workspaces/${workspaceId}/invites`, payload);
    return response.data?.data;
  },

  // List pending invites for workspace
  async listPendingInvites(workspaceId: string): Promise<WorkspaceInvite[]> {
    const response = await api.get(`/api/v1/workspaces/${workspaceId}/invites`);
    return response.data?.data || [];
  },

  // Revoke invite
  async revokeInvite(workspaceId: string, inviteId: string): Promise<void> {
    await api.delete(`/api/v1/workspaces/${workspaceId}/invites/${inviteId}`);
  },

  // Change member role
  async changeMemberRole(workspaceId: string, userId: string, role: string): Promise<WorkspaceMember> {
    const response = await api.patch(`/api/v1/workspaces/${workspaceId}/members/${userId}`, { role });
    return response.data?.data;
  },

  // Remove member from workspace
  async removeMember(workspaceId: string, userId: string): Promise<void> {
    await api.delete(`/api/v1/workspaces/${workspaceId}/members/${userId}`);
  },

  // Leave workspace
  async leaveWorkspace(workspaceId: string): Promise<void> {
    await api.post(`/api/v1/workspaces/${workspaceId}/leave`);
  },

  // Get public invitation details by token
  async getInviteDetails(token: string): Promise<WorkspaceInviteDetails> {
    const response = await api.get(`/api/v1/workspaces/invites/${token}`);
    return response.data?.data;
  },

  // Accept invitation token
  async acceptInvite(token: string): Promise<{ workspaceId: string; message: string; role?: string; alreadyMember?: boolean }> {
    const response = await api.post(`/api/v1/workspaces/invites/${token}/accept`);
    return response.data;
  },

  // Decline invitation token
  async declineInvite(token: string): Promise<{ message: string }> {
    const response = await api.post(`/api/v1/workspaces/invites/${token}/decline`);
    return response.data;
  },

  // Get workspace analytics
  async getWorkspaceAnalytics(workspaceId: string): Promise<WorkspaceAnalytics> {
    const response = await api.get(`/api/v1/workspaces/${workspaceId}/analytics`);
    return response.data?.data;
  },

  // Get workspace activity audit logs
  async getActivityLogs(workspaceId: string, page = 1, limit = 20): Promise<ActivityLogsResponse> {
    const response = await api.get(`/api/v1/workspaces/${workspaceId}/activity-logs`, {
      params: { page, limit },
    });
    return response.data?.data || { logs: [], total: 0, page, limit };
  },

  // Upload workspace logo image
  async uploadLogo(workspaceId: string, formData: FormData): Promise<Workspace> {
    const response = await api.post(`/api/v1/workspaces/${workspaceId}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data?.data;
  },
};

export default workspaceService;
