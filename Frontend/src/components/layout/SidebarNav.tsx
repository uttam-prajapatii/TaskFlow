import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from '../UI/Icon';

interface NavItem {
  id: string;
  icon: string;
  label: string;
  to: string;
  badge?: number;
}

interface SidebarNavProps {
  taskNavItems: NavItem[];
  workspaceNavItems: NavItem[];
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  taskNavItems,
  workspaceNavItems,
}) => {
  const location = useLocation();
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
      return (
        (pathname.startsWith('/workspaces/') && activeTab === 'members') ||
        pathname === '/members'
      );
    }
    if (id === 'invitations') {
      return pathname.startsWith('/workspaces/') && activeTab === 'invitations';
    }
    if (id === 'settings') {
      return pathname.startsWith('/workspaces/') && activeTab === 'settings';
    }
    return false;
  };

  return (
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
                <Icon
                  name={it.icon}
                  size={16}
                  className={active ? 'text-orange-500' : 'text-neutral-400'}
                />
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
                <Icon
                  name={it.icon}
                  size={16}
                  className={active ? 'text-orange-500' : 'text-neutral-400'}
                />
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
  );
};

export default SidebarNav;
