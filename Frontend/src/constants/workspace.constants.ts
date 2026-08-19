export const WORKSPACE_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const;

export const WORKSPACE_TABS = [
  { id: 'boards', label: 'Boards', icon: 'barChart' },
  { id: 'members', label: 'Members', icon: 'users' },
  { id: 'invitations', label: 'Invitations', icon: 'mail' },
  { id: 'activity', label: 'Activity Log', icon: 'history' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
] as const;

export type WorkspaceTabId = typeof WORKSPACE_TABS[number]['id'];

export const PRESET_WORKSPACE_COLORS = [
  '#FF501E', // TaskFlow Flame
  '#6366F1', // Indigo
  '#0EA5E9', // Sky Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#14B8A6', // Teal
];
