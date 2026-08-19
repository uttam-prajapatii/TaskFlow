import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import useAuth from '../../hooks/useAuth';
import { useWorkspace } from '../../context/WorkspaceContext';
import WorkspaceAvatar from '../UI/WorkspaceAvatar';
import type { MenuItem } from '../UI/DropdownMenu';
import CreateWorkspaceModal from '../../features/workspace/components/CreateWorkspaceModal';
import workspaceService from '../../services/workspace.service';
import notificationService from '../../services/notification.service';
import useSocketNotifications from '../../hooks/useSocketNotifications';
import type { CreateWorkspacePayload } from '../../features/workspace/types';
import ConfirmModal from '../UI/ConfirmModal';
import WorkspaceSelector from './WorkspaceSelector';
import SidebarNav from './SidebarNav';
import UserProfileFooter from './UserProfileFooter';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { workspaces, currentWorkspace, setCurrentWorkspace, refreshWorkspaces } = useWorkspace();
  const navigate = useNavigate();

  // Listen for real-time WebSocket notifications
  useSocketNotifications();

  // Query dynamic unread notification count from backend API
  const { data: unreadCount } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => notificationService.getUnreadCount(),
    enabled: !!user,
    staleTime: 1000 * 30, // 30s
  });

  const [wsMenuOpen, setWsMenuOpen] = useState(false);
  const [createWsOpen, setCreateWsOpen] = useState(false);
  const [creatingWs, setCreatingWs] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const [leavingWs, setLeavingWs] = useState(false);

  const effectiveWorkspace =
    currentWorkspace && workspaces.some((w) => (w._id || w.id) === (currentWorkspace._id || currentWorkspace.id))
      ? currentWorkspace
      : workspaces[0] || null;

  const currentWorkspaceId = effectiveWorkspace?._id || effectiveWorkspace?.id || '';
  const currentWsName = effectiveWorkspace?.name || 'Workspace';

  const handleCreateWorkspace = async (payload: CreateWorkspacePayload) => {
    try {
      setCreatingWs(true);
      const created = await workspaceService.createWorkspace(payload);
      toast.success(`Workspace "${created.name}" created!`);
      setCreateWsOpen(false);
      await refreshWorkspaces();
      setCurrentWorkspace(created);
      navigate(`/workspaces/${created._id || created.id}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to create workspace');
    } finally {
      setCreatingWs(false);
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!currentWorkspaceId) return;
    try {
      setLeavingWs(true);
      await workspaceService.leaveWorkspace(currentWorkspaceId);
      toast.success(`Left workspace "${currentWsName}"`);
      setConfirmLeaveOpen(false);
      await refreshWorkspaces();
      navigate('/workspace-select');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to leave workspace');
    } finally {
      setLeavingWs(false);
      setConfirmLeaveOpen(false);
    }
  };

  const taskNavItems = [
    { id: 'assigned-tasks', icon: 'user-check', label: 'Assigned Tasks', to: '/tasks/assigned' },
    { id: 'created-tasks', icon: 'file-plus', label: 'My Created Tasks', to: '/tasks/created' },
  ];

  const workspaceNavItems = [
    { id: 'boards', icon: 'kanban', label: 'Boards', to: '/boards' },
    {
      id: 'notifications',
      icon: 'bell',
      label: 'Notifications',
      to: '/notifications',
      badge: unreadCount && unreadCount > 0 ? unreadCount : undefined,
    },
    {
      id: 'members',
      icon: 'users',
      label: 'Members',
      to: '/members',
    },
    {
      id: 'invitations',
      icon: 'mail',
      label: 'Invitations',
      to: currentWorkspaceId ? `/workspaces/${currentWorkspaceId}?tab=invitations` : '/workspace-select',
    },
    { id: 'analytics', icon: 'activity', label: 'Analytics', to: '/analytics' },
    {
      id: 'settings',
      icon: 'settings',
      label: 'Settings',
      to: currentWorkspaceId ? `/workspaces/${currentWorkspaceId}?tab=settings` : '/workspace-select',
    },
  ];

  const wsMenuItems: MenuItem[] = [
    {
      label: 'Switch Workspace',
      icon: 'arrow-left-right',
      onClick: () => navigate('/workspace-select'),
    },
    {
      label: 'Create Workspace',
      icon: 'plus',
      onClick: () => setCreateWsOpen(true),
    },
    {
      label: 'Manage Workspaces',
      icon: 'folder',
      onClick: () => navigate('/workspace-select'),
    },
    {
      label: 'Leave Current Workspace',
      icon: 'log-out',
      danger: true,
      onClick: () => setConfirmLeaveOpen(true),
    },
    { divider: true },
    ...workspaces.map((ws) => {
      const isSelected = (ws._id || ws.id) === currentWorkspaceId;
      return {
        label: ws.name,
        avatarNode: (
          <WorkspaceAvatar
            name={ws.name}
            logoUrl={ws.logoUrl}
            color={ws.accentColor || ws.settings?.color || ws.color}
            size={22}
            roundedClassName="rounded-md"
          />
        ),
        endIcon: isSelected ? 'check' : undefined,
        onClick: () => {
          setCurrentWorkspace(ws);
          navigate(`/workspaces/${ws._id || ws.id}`);
        },
      };
    }),
    { divider: true },
    {
      label: 'Sign Out',
      icon: 'log-out',
      onClick: () => logout(),
    },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-900 flex flex-col h-screen shrink-0 sticky top-0 z-20 select-none font-sans">
      {/* BRAND HEADER (OFFICIAL LOGO) */}
      <Link to="/workspace-select" className="p-4 flex items-center gap-3 group">
        <img
          src="/logo.png"
          alt="TaskFlow Logo"
          className="w-9 h-9 rounded-xl object-contain shadow-md shadow-orange-500/15 group-hover:scale-105 transition-transform"
        />
        <span className="font-extrabold text-lg text-neutral-900 dark:text-neutral-100 tracking-tight font-display">
          TaskFlow
        </span>
      </Link>

      {/* WORKSPACE SELECTOR */}
      <WorkspaceSelector
        currentWorkspace={effectiveWorkspace}
        workspaces={workspaces}
        menuOpen={wsMenuOpen}
        setMenuOpen={setWsMenuOpen}
        menuItems={wsMenuItems}
      />

      {/* NAVIGATION SECTION */}
      <SidebarNav
        taskNavItems={taskNavItems}
        workspaceNavItems={workspaceNavItems}
      />

      {/* USER PROFILE & FOOTER CONTROLS */}
      <UserProfileFooter
        user={user}
        currentWorkspaceId={currentWorkspaceId}
        onLogout={logout}
      />

      <CreateWorkspaceModal
        open={createWsOpen}
        onClose={() => setCreateWsOpen(false)}
        onCreate={handleCreateWorkspace}
        creating={creatingWs}
      />

      <ConfirmModal
        target={confirmLeaveOpen ? { name: currentWsName } : null}
        mode="leave"
        working={leavingWs}
        onClose={() => setConfirmLeaveOpen(false)}
        onConfirm={handleLeaveWorkspace}
      />
    </aside>
  );
};

export default Sidebar;
