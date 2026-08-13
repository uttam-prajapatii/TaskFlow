export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface WorkspaceSettings {
  color?: string;
  allowViewerComments?: boolean;
  inviteExpiryDays?: number;
}

export interface WorkspaceMemberUser {
  _id: string;
  fullName?: string;
  email?: string;
  name?: string;
}

export interface WorkspaceMember {
  userId: string | WorkspaceMemberUser;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface Workspace {
  _id: string;
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  logoUrl?: string | null;
  ownerId: string | { _id: string; fullName?: string; email?: string };
  members?: WorkspaceMember[];
  settings?: WorkspaceSettings;
  color?: string;
  boardCount?: number;
  activity?: 'active' | 'idle';
  isArchived?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface WorkspaceInvite {
  _id: string;
  id?: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  status: InviteStatus;
  token?: string;
  sentAt?: string;
  createdAt: string;
}

export interface CreateWorkspacePayload {
  name: string;
  description?: string;
  settings?: {
    color?: string;
  };
}

export interface UpdateWorkspacePayload {
  name?: string;
  description?: string;
  settings?: {
    color?: string;
  };
}

export interface InviteMemberPayload {
  email: string;
  role: WorkspaceRole;
}

export interface WorkspaceAnalytics {
  totalBoards: number;
  totalMembers: number;
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  completionRate: number;
  priorityBreakdown: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  velocity: Array<{
    weekStart: string;
    completedCount: number;
  }>;
  averageCycleTimeDays: number;
}

export interface ActivityLogActor {
  _id: string;
  fullName?: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
}

export interface ActivityLogItem {
  _id: string;
  workspaceId: string;
  actorId: string | ActivityLogActor;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ActivityLogsResponse {
  logs: ActivityLogItem[];
  total: number;
  page: number;
  limit: number;
}
