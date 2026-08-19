export const APP_ROUTES = {
  // Public / Auth
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY_OTP: '/verify-otp',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  AUTH_CALLBACK: '/auth/callback',
  INVITE: (token = ':token') => `/invite/${token}`,
  WORKSPACE_INVITE: (token = ':token') => `/workspaces/invite/${token}`,

  // Protected Routes
  DASHBOARD: '/dashboard',
  ONBOARDING: '/onboarding',
  WORKSPACE_SELECT: '/workspace-select',
  WORKSPACES_MANAGE: '/workspaces/manage',
  WORKSPACE_DETAIL: (workspaceId = ':workspaceId') => `/workspaces/${workspaceId}`,
  BOARDS: '/boards',
  BOARD_KANBAN: (boardId = ':boardId') => `/boards/${boardId}`,
  TASKS_ASSIGNED: '/tasks/assigned',
  TASKS_ME: '/tasks/me',
  TASKS_CREATED: '/tasks/created',
  NOTIFICATIONS: '/notifications',
  ANALYTICS: '/analytics',
  MEMBERS: '/members',
  SECURITY_SETTINGS: '/settings/password',
} as const;
