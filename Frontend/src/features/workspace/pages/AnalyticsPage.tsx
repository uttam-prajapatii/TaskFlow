import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '../../../components/layout/Sidebar';
import Icon from '../../../components/UI/Icon';
import { useWorkspace } from '../../../context/WorkspaceContext';
import workspaceService from '../../../services/workspace.service';

export const AnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentWorkspace, workspaces } = useWorkspace();

  const wsId = currentWorkspace?._id || currentWorkspace?.id;
  const wsName = currentWorkspace?.name || 'Workspace';

  const { data: analytics, isLoading, isError, refetch } = useQuery({
    queryKey: ['workspace-analytics', wsId],
    queryFn: () => (wsId ? workspaceService.getWorkspaceAnalytics(wsId) : null),
    enabled: !!wsId,
  });

  const totalTasks = analytics?.totalTasks ?? 0;
  const completedTasks = analytics?.completedTasks ?? (analytics as unknown as { completedTasksCount?: number })?.completedTasksCount ?? 0;
  const activeTasks = analytics?.activeTasks ?? (analytics as unknown as { activeTasksCount?: number })?.activeTasksCount ?? Math.max(0, totalTasks - completedTasks);
  const completionRate = analytics?.completionRate ?? (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);
  const totalBoards = analytics?.totalBoards ?? currentWorkspace?.boardCount ?? 0;
  const totalMembers = analytics?.totalMembers ?? currentWorkspace?.members?.length ?? 1;
  const cycleTime = analytics?.averageCycleTimeDays ?? 0;
  const priorities = analytics?.priorityBreakdown || { low: 0, medium: 0, high: 0, urgent: 0 };
  const velocity = analytics?.velocity || [];

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans">
      {/* Sidebar stays ALWAYS open on left */}
      <Sidebar />

      <main className="flex-1 min-w-0 h-screen overflow-y-auto p-6 md:p-10">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold font-display text-neutral-900 dark:text-neutral-100">
                Workspace Analytics
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Real-time insights and task completion velocity for <strong className="text-neutral-800 dark:text-neutral-200">{wsName}</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate(wsId ? `/workspaces/${wsId}` : '/workspace-select')}
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
                {totalBoards}
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
                {totalMembers}
              </div>
              <p className="text-[11px] text-neutral-400 font-medium mt-2">
                Collaborators joined
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
              <div className="flex items-center justify-between text-neutral-400 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider">Completion Rate</span>
                <Icon name="check-circle-2" size={18} className="text-emerald-500" />
              </div>
              <div className="text-3xl font-extrabold font-display text-emerald-500">
                {completionRate}%
              </div>
              <p className="text-[11px] text-emerald-500 font-semibold mt-2 flex items-center gap-1">
                <Icon name="check" size={13} /> {completedTasks} / {totalTasks} tasks done
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl">
              <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-neutral-400">Loading live analytics data…</p>
            </div>
          ) : isError ? (
            <div className="p-10 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl">
              <p className="text-sm text-rose-500 font-semibold mb-3">Failed to load workspace analytics</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-semibold"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Task Breakdown & Execution Section */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xs">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                  Task Execution & Breakdown
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
                  Overview of task volume, cycle times, and priority distributions.
                </p>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      <span>Overall Completion Progress</span>
                      <span className="text-orange-500 font-bold">{completionRate}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 grid grid-cols-2 gap-4">
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
                      <span className="text-[11px] font-medium text-neutral-400 uppercase">Active Tasks</span>
                      <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">{activeTasks}</p>
                    </div>
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
                      <span className="text-[11px] font-medium text-neutral-400 uppercase">Avg. Cycle Time</span>
                      <p className="text-xl font-bold text-emerald-500 mt-0.5">
                        {completedTasks > 0 && cycleTime > 0 ? `${cycleTime} days` : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Priority Pill Distribution */}
                  <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-3">Tasks by Priority</h4>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">Low</span>
                        <p className="text-sm font-extrabold text-blue-700 dark:text-blue-300 mt-0.5">{priorities.low}</p>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Medium</span>
                        <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">{priorities.medium}</p>
                      </div>
                      <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">High</span>
                        <p className="text-sm font-extrabold text-amber-700 dark:text-amber-300 mt-0.5">{priorities.high}</p>
                      </div>
                      <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">Urgent</span>
                        <p className="text-sm font-extrabold text-rose-700 dark:text-rose-300 mt-0.5">{priorities.urgent}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Weekly Completion Velocity */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xs flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                    Weekly Completion Velocity
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
                    Tasks completed per week over the past 4 weeks.
                  </p>

                  <div className="space-y-4">
                    {velocity.length === 0 || velocity.every((v) => v.completedCount === 0) ? (
                      <div className="py-8 text-center">
                        <p className="text-xs text-neutral-400">No completed tasks yet</p>
                      </div>
                    ) : (
                      velocity.map((v, i) => {
                        const maxVal = Math.max(...velocity.map((w) => w.completedCount), 1);
                        const pct = Math.round((v.completedCount / maxVal) * 100);
                        return (
                          <div key={i}>
                            <div className="flex justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                              <span>Week of {v.weekStart}</span>
                              <span className="text-orange-500 font-bold">{v.completedCount} completed</span>
                            </div>
                            <div className="w-full h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-orange-500 rounded-full transition-all duration-500"
                                style={{ width: `${v.completedCount > 0 ? Math.max(pct, 8) : 0}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
                  <span className="flex items-center gap-1.5 text-emerald-500 font-medium">
                    <Icon name="shield-check" size={14} /> Live Sync
                  </span>
                  <span>Updated live</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AnalyticsPage;
