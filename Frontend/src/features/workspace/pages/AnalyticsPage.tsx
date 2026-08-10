import React from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../../components/layout/Sidebar';
import Icon from '../../../components/UI/Icon';
import { useWorkspace } from '../../../context/WorkspaceContext';

export const AnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentWorkspace, workspaces } = useWorkspace();

  const wsName = currentWorkspace?.name || 'Workspace';

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans">
      {/* Sidebar stays ALWAYS open on left */}
      <Sidebar />

      <main className="flex-1 min-w-0 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold font-display text-neutral-900 dark:text-neutral-100">
                Workspace Analytics
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Real-time insights for <strong className="text-neutral-800 dark:text-neutral-200">{wsName}</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate(currentWorkspace?._id || currentWorkspace?.id ? `/workspaces/${currentWorkspace._id || currentWorkspace.id}` : '/workspace-select')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 transition cursor-pointer shrink-0 shadow-2xs"
            >
              <Icon name="layout" size={15} /> View Workspace
            </button>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
              <div className="flex items-center justify-between text-neutral-400 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider">Total Workspaces</span>
                <Icon name="folder" size={18} className="text-orange-500" />
              </div>
              <div className="text-3xl font-extrabold font-display text-neutral-900 dark:text-neutral-100">
                {workspaces.length}
              </div>
              <p className="text-[11px] text-emerald-500 font-semibold mt-2 flex items-center gap-1">
                <Icon name="trending-up" size={13} /> Active & operational
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
              <div className="flex items-center justify-between text-neutral-400 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider">Active Boards</span>
                <Icon name="layoutGrid" size={18} className="text-blue-500" />
              </div>
              <div className="text-3xl font-extrabold font-display text-neutral-900 dark:text-neutral-100">
                {currentWorkspace?.boardCount ?? 1}
              </div>
              <p className="text-[11px] text-neutral-400 font-medium mt-2">
                Across current workspace
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
              <div className="flex items-center justify-between text-neutral-400 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider">Team Members</span>
                <Icon name="users" size={18} className="text-violet-500" />
              </div>
              <div className="text-3xl font-extrabold font-display text-neutral-900 dark:text-neutral-100">
                {currentWorkspace?.members?.length ?? 1}
              </div>
              <p className="text-[11px] text-neutral-400 font-medium mt-2">
                Collaborators joined
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
              <div className="flex items-center justify-between text-neutral-400 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider">Workspace Health</span>
                <Icon name="shield-check" size={18} className="text-emerald-500" />
              </div>
              <div className="text-3xl font-extrabold font-display text-emerald-500">
                100%
              </div>
              <p className="text-[11px] text-emerald-500 font-semibold mt-2 flex items-center gap-1">
                <Icon name="check" size={13} /> Synchronized
              </p>
            </div>
          </div>

          {/* Activity Breakdown Section */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 md:p-8 shadow-2xs">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1">
              Task Execution & Velocity
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
              Track project progress and completed milestones over time.
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  <span>Sprint Completion Rate</span>
                  <span className="text-orange-500 font-bold">85%</span>
                </div>
                <div className="w-full h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full w-[85%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  <span>Board Organization & Structure</span>
                  <span className="text-blue-500 font-bold">92%</span>
                </div>
                <div className="w-full h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full w-[92%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  <span>Team Response & Collaboration</span>
                  <span className="text-emerald-500 font-bold">98%</span>
                </div>
                <div className="w-full h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-[98%]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AnalyticsPage;
