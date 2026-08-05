export type WorkspaceVisibility = 'private' | 'public';
export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface WorkspaceSettings {
  color?: string;
  visibility?: WorkspaceVisibility;
  allowViewerComments?: boolean;
  defaultBoardVisibility?: 'workspace' | 'private';
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
  visibility?: WorkspaceVisibility;
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
    visibility?: WorkspaceVisibility;
  };
}

export interface UpdateWorkspacePayload {
  name?: string;
  description?: string;
  settings?: {
    color?: string;
    visibility?: WorkspaceVisibility;
  };
}

export interface InviteMemberPayload {
  email: string;
  role: WorkspaceRole;
}
