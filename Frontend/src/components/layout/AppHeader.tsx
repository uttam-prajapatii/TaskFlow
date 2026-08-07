import React from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import Avatar from '../UI/Avatar';
import Icon from '../UI/Icon';

interface AppHeaderProps {
  showBrand?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ showBrand = true }) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Left Brand Identifier */}
      {showBrand ? (
        <Link to="/workspace-select" className="flex items-center gap-2.5 group">
          <img
            src="/logo.png"
            alt="TaskFlow Logo"
            className="w-8 h-8 rounded-lg object-contain block shadow-xs group-hover:scale-105 transition-transform"
          />
          <span className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100 font-display">
            TaskFlow
          </span>
        </Link>
      ) : (
        <div />
      )}

      {/* Right User Profile & Sign Out Action */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-neutral-100/80 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800">
          <Avatar name={user?.fullName || 'User'} size={26} ring={false} />
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 leading-none">
              {user?.fullName || 'User'}
            </p>
            <p className="text-[10px] text-neutral-400 leading-tight truncate max-w-[140px]">
              {user?.email}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => logout()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-red-300 dark:hover:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30 text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 text-xs font-semibold transition-all cursor-pointer bg-white dark:bg-neutral-900 shadow-2xs"
        >
          <Icon name="log-out" size={14} />
          <span>Sign out</span>
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
