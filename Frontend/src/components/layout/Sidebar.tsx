import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { useWorkspace } from '../../context/WorkspaceContext';
import Icon from '../UI/Icon';
import Avatar, { initials } from '../UI/Avatar';
import DropdownMenu, { type MenuItem } from '../UI/DropdownMenu';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const { workspaces, currentWorkspace, setCurrentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [wsMenuOpen, setWsMenuOpen] = useState(false);

  const currentWorkspaceId = currentWorkspace?._id || currentWorkspace?.id || '';
  const currentWsName = currentWorkspace?.name || 'Workspace';
  const visibility = currentWorkspace?.settings?.visibility || currentWorkspace?.visibility || 'private';

  const workspaceNavItems = [
    { icon: 'home', label: 'Dashboard', to: '/dashboard' },
    { icon: 'barChart', label: 'Boards', to: '/boards' },
    {
      icon: 'bell',
      label: 'Notifications',
      to: '/notifications',
      badge: 3,
    },
    {
      icon: 'users',
      label: 'Members',
      to: currentWorkspaceId ? `/workspaces/${currentWorkspaceId}` : '/workspaces',
    },
    { icon: 'activity', label: 'Analytics', to: '/analytics' },
    { icon: 'settings', label: 'Settings', to: '/settings' },
  ];

  const wsMenuItems: MenuItem[] = [
    {
      label: 'Manage Workspaces',
      icon: 'folder',
      onClick: () => navigate('/workspaces'),
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
  ];

  return (
    <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 h-screen sticky top-0">
      {/* Brand Header */}
      <Link to="/boards" className="flex items-center gap-2.5 px-5 pt-5 pb-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 via-orange-500 to-red-500 flex items-center justify-center shadow-xs">
          <div className="w-3 h-3 rounded-sm bg-white" />
        </div>
        <span className="text-[17px] font-bold tracking-tight text-neutral-900 dark:text-neutral-100 font-display">
          TaskFlow
        </span>
      </Link>

      {/* TOP WORKSPACE SELECTOR CARD */}
      <div className="px-3 pb-3">
        <DropdownMenu
          open={wsMenuOpen}
          setOpen={setWsMenuOpen}
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
                  {visibility === 'public' ? 'Public Workspace' : 'Pro Workspace'}
                </p>
              </div>
              <Icon name="chevron-down" size={14} className="text-neutral-400 shrink-0" />
            </button>
          }
          items={wsMenuItems}
        />
      </div>

      {/* WORKSPACE NAVIGATION SECTION */}
      <div className="flex-1 px-3 overflow-y-auto">
        <p className="px-3 pt-2 pb-1.5 text-[10.5px] font-bold tracking-wider text-neutral-400 dark:text-neutral-500 uppercase">
          WORKSPACE
        </p>
        <nav className="space-y-0.5">
          {workspaceNavItems.map((it) => (
            <NavLink
              key={it.label}
              to={it.to}
              className={({ isActive }) =>
                `w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition ${
                  isActive
                    ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`
              }
            >
              <Icon name={it.icon} size={16} />
              <span className="flex-1">{it.label}</span>
              {it.badge && (
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center shadow-2xs">
                  {it.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* USER PROFILE FOOTER CARD */}
      <div className="p-3 border-t border-neutral-100 dark:border-neutral-900">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer transition-colors">
          <Avatar name={user?.fullName || 'User'} size={30} ring={false} />
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-bold text-neutral-800 dark:text-neutral-100 truncate">
              {user?.fullName || 'TaskFlow User'}
            </p>
            <p className="text-[11px] text-neutral-400 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
