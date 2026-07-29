import React, { useCallback } from 'react';
import useAuth from '../../hooks/useAuth';
import BrandPanel from '../auth/components/BrandPanel';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  return (
    <div className="w-full min-h-screen bg-paper flex flex-col select-none">
      {/* Top Header Navigation */}
      <header className="w-full bg-white border-b border-line px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-flame-1 via-flame-2 to-flame-3 flex items-center justify-center text-white font-display font-bold text-base shadow-sm">
            TF
          </div>
          <span className="font-display font-bold text-lg text-ink tracking-tight">
            TaskFlow
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="font-display font-semibold text-sm text-ink">
              {user?.fullName || 'TaskFlow User'}
            </span>
            <span className="text-xs text-ink-soft">{user?.email}</span>
          </div>

          <button
            onClick={handleLogout}
            type="button"
            className="px-4 py-2 rounded-xl text-xs font-display font-bold border border-line bg-paper-dim hover:bg-white text-ink-soft hover:text-ink transition-all duration-200 cursor-pointer shadow-xs"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-10 flex flex-col gap-8">
        <div className="bg-white rounded-2xl border border-line p-6 md:p-8 shadow-xs animate-[fadeUp_0.35s_ease]">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-paper-dim border border-line flex items-center justify-center text-flame-2 font-display text-2xl font-bold">
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">
                Welcome,{' '}{user?.fullName || 'User'}!
              </h1>
              <p className="text-sm text-ink-soft mt-0.5">
                Your authentication session is active and verified.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-line">
            <div className="bg-paper-dim rounded-xl p-4 border border-line">
              <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider">
                Account Email
              </span>
              <p className="font-display font-semibold text-ink text-sm mt-1 truncate">
                {user?.email || 'N/A'}
              </p>
            </div>

            <div className="bg-paper-dim rounded-xl p-4 border border-line">
              <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider">
                User ID
              </span>
              <p className="font-mono text-xs text-ink font-medium mt-1 truncate">
                {user?._id || 'N/A'}
              </p>
            </div>

            <div className="bg-paper-dim rounded-xl p-4 border border-line">
              <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider">
                Account Status
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-display font-semibold text-emerald-700 text-xs uppercase tracking-wider">
                  {user?.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature showcase / Brand Preview Panel */}
        <div className="rounded-2xl overflow-hidden border border-line shadow-xs">
          <BrandPanel />
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
