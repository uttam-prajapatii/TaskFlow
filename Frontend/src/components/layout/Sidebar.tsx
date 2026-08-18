import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import useAuth from '../../hooks/useAuth';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useTheme } from '../../context/ThemeContext';
import Icon from '../UI/Icon';
import Avatar, { initials } from '../UI/Avatar';
import DropdownMenu, { type MenuItem } from '../UI/DropdownMenu';
import CreateWorkspaceModal from '../../features/workspace/components/CreateWorkspaceModal';
import workspaceService from '../../services/workspace.service';
import notificationService from '../../services/notification.service';
import useSocketNotifications from '../../hooks/useSocketNotifications';
import type { CreateWorkspacePayload } from '../../features/workspace/types';

import ConfirmModal from '../UI/ConfirmModal';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { workspaces, currentWorkspace, setCurrentWorkspace, refreshWorkspaces } = useWorkspace();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

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

  const pathname = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab');

  const isItemActive = (id: string) => {
    if (id === 'boards') {
      return pathname.startsWith('/boards');
    }
    if (id === 'assigned-tasks') {
      return pathname === '/tasks/assigned' || pathname === '/tasks/me';
    }
    if (id === 'created-tasks') {
      return pathname === '/tasks/created';
    }
    if (id === 'notifications') {
      return pathname === '/notifications';
    }
    if (id === 'analytics') {
      return pathname === '/analytics';
    }
    if (id === 'members') {
      return pathname.startsWith('/workspaces/') && activeTab === 'members';
    }
    if (id === 'invitations') {
      return pathname.startsWith('/workspaces/') && activeTab === 'invitations';
    }
    if (id === 'settings') {
      return pathname.startsWith('/workspaces/') && activeTab === 'settings';
    }
    return false;
  };

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
    { id: 'boards', icon: 'barChart', label: 'Boards', to: '/boards' },
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
      to: currentWorkspaceId ? `/workspaces/${currentWorkspaceId}?tab=members` : '/workspace-select',
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
    ...workspaces.map((ws) => ({
      label: ws.name,
      icon: (ws._id || ws.id) === currentWorkspaceId ? 'check' : undefined,
      onClick: () => {
        setCurrentWorkspace(ws);
        navigate(`/workspaces/${ws._id || ws.id}`);
      },
    })),
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

      {/* TOP WORKSPACE SELECTOR CARD (FULL WIDTH CONTAINED DROPDOWN) */}
      <div className="px-3 pb-3">
        <DropdownMenu
          open={wsMenuOpen}
          setOpen={setWsMenuOpen}
          fullWidth={true}
          align="left"
          trigger={
            <button
              type="button"
              onClick={() => setWsMenuOpen((v) => !v)}
              className="w-full flex items-center gap-2.5 p-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/80 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all text-left cursor-pointer shadow-2xs"
            >
              <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold flex items-center justify-center text-xs shrink-0">
                {initials(currentWsName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100 truncate leading-tight">
                  {currentWsName}
                </p>
                <p className="text-[10.5px] text-neutral-400 truncate capitalize mt-0.5">
                  Workspace
                </p>
              </div>
              <Icon
                name="chevron-down"
                size={14}
                className={`text-neutral-400 shrink-0 transition-transform duration-200 ${
                  wsMenuOpen ? 'rotate-180 text-orange-500' : 'rotate-0'
                }`}
              />
            </button>
          }
          items={wsMenuItems}
        />
      </div>

      {/* NAVIGATION SECTION */}
      <div className="flex-1 px-3 overflow-y-auto space-y-4">
        {/* MY WORK NAVIGATION */}
        <div>
          <p className="px-3 pt-2 pb-1.5 text-[10.5px] font-bold tracking-wider text-neutral-400 dark:text-neutral-500 uppercase">
            MY WORK
          </p>
          <nav className="space-y-0.5">
            {taskNavItems.map((it) => {
              const active = isItemActive(it.id);
              return (
                <Link
                  key={it.id}
                  to={it.to}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition ${
                    active
                      ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold border border-orange-200/60 dark:border-orange-500/20 shadow-2xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  <Icon name={it.icon} size={16} className={active ? 'text-orange-500' : 'text-neutral-400'} />
                  <span className="flex-1">{it.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* WORKSPACE NAVIGATION */}
        <div>
          <p className="px-3 pt-2 pb-1.5 text-[10.5px] font-bold tracking-wider text-neutral-400 dark:text-neutral-500 uppercase">
            WORKSPACE
          </p>
          <nav className="space-y-0.5">
            {workspaceNavItems.map((it) => {
              const active = isItemActive(it.id);
              return (
                <Link
                  key={it.id}
                  to={it.to}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition ${
                    active
                      ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold border border-orange-200/60 dark:border-orange-500/20 shadow-2xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  <Icon name={it.icon} size={16} className={active ? 'text-orange-500' : 'text-neutral-400'} />
                  <span className="flex-1">{it.label}</span>
                  {it.badge && (
                    <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center shadow-2xs">
                      {it.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* USER PROFILE & FOOTER CONTROLS */}
      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/30 shrink-0">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-neutral-100/60 dark:hover:bg-neutral-900/60 transition-colors">
          <Avatar name={user?.fullName || 'User'} size={36} ring={false} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100 truncate leading-tight">
              {user?.fullName || 'TaskFlow User'}
            </p>
            <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
              {user?.email || 'user@taskflow.com'}
            </p>
          </div>
        </div>

        {/* Footer Actions: Theme Toggle, Security, Settings, Sign Out */}
        <div className="flex items-center justify-between gap-1 mt-2 pt-2 border-t border-neutral-200/60 dark:border-neutral-800/80">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition cursor-pointer font-semibold text-xs"
          >
            <Icon
              name={theme === 'dark' ? 'moon' : 'sun'}
              size={15}
              className={theme === 'dark' ? 'text-amber-400' : 'text-amber-500'}
            />
            <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
          </button>

          {/* Account Security Button */}
          <button
            type="button"
            onClick={() => navigate('/settings/password')}
            title="Account Security & Password"
            className="p-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition cursor-pointer shrink-0"
          >
            <Icon name="lock" size={15} />
          </button>

          {/* Settings Link Button */}
          <button
            type="button"
            onClick={() => navigate(currentWorkspaceId ? `/workspaces/${currentWorkspaceId}?tab=settings` : '/workspaces/manage')}
            title="Workspace Settings"
            className="p-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition cursor-pointer shrink-0"
          >
            <Icon name="settings" size={15} />
          </button>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={() => logout()}
            title="Sign Out"
            className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer shrink-0"
          >
            <Icon name="log-out" size={15} />
          </button>
        </div>
      </div>

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
