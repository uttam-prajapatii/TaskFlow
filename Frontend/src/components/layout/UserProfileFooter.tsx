import React from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../UI/Avatar';
import Icon from '../UI/Icon';
import { useTheme } from '../../context/ThemeContext';
import type { User } from '../../features/auth/types';

interface UserProfileFooterProps {
  user: User | null;
  currentWorkspaceId: string;
  onLogout: () => void;
}

export const UserProfileFooter: React.FC<UserProfileFooterProps> = ({
  user,
  currentWorkspaceId,
  onLogout,
}) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
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
          onClick={() =>
            navigate(
              currentWorkspaceId
                ? `/workspaces/${currentWorkspaceId}?tab=settings`
                : '/workspaces/manage'
            )
          }
          title="Workspace Settings"
          className="p-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition cursor-pointer shrink-0"
        >
          <Icon name="settings" size={15} />
        </button>

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={onLogout}
          title="Sign Out"
          className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer shrink-0"
        >
          <Icon name="log-out" size={15} />
        </button>
      </div>
    </div>
  );
};

export default UserProfileFooter;
