import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '../../../components/layout/Sidebar';
import Icon from '../../../components/UI/Icon';
import Avatar from '../../../components/UI/Avatar';
import TaskDrawer from '../components/TaskDrawer';
import taskService from '../../../services/task.service';
import listService from '../../../services/list.service';
import { useWorkspace } from '../../../context/WorkspaceContext';
import { PRIORITY_CONFIG, getLabelMeta, isOverdue, formatDate } from '../components/KanbanTaskCard';
import type { Task, BoardList, PriorityLevel, Label, TaskAssigneeUser } from '../types';

export const CreatedTasksPage: React.FC = () => {
  const navigate = useNavigate();
  const { workspaces, currentWorkspace } = useWorkspace();

  const [search, setSearch] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'done'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'dueDate' | 'priority' | 'title'>('newest');

  // Drawer state
  const [drawerTask, setDrawerTask] = useState<Task | null>(null);
  const [drawerColumns, setDrawerColumns] = useState<BoardList[]>([]);

  // Fetch created tasks
  const {
    data: tasks = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Task[]>({
    queryKey: ['created-tasks'],
    queryFn: () => taskService.getCreatedTasks(),
    staleTime: 1000 * 30, // 30s
  });

  // Open task in drawer
  const handleOpenTask = async (task: Task) => {
    setDrawerTask(task);
    const boardId = typeof task.boardId === 'object' && task.boardId !== null ? task.boardId._id : task.boardId;
    if (boardId) {
      try {
        const lists = await listService.getBoardLists(boardId);
        setDrawerColumns(lists);
      } catch {
        setDrawerColumns([]);
      }
    } else {
      setDrawerColumns([]);
    }
  };

  // Helper getters
  const getTaskBoard = (task: Task) => {
    if (typeof task.boardId === 'object' && task.boardId !== null) {
      return task.boardId;
    }
    return null;
  };

  const getTaskWorkspace = (task: Task) => {
    const board = getTaskBoard(task);
    if (board && typeof board.workspaceId === 'object' && board.workspaceId !== null) {
      return board.workspaceId;
    }
    if (typeof task.workspaceId === 'object' && task.workspaceId !== null) {
      return task.workspaceId;
    }
    // Fallback: match board.workspaceId string with workspaces list
    if (board && typeof board.workspaceId === 'string') {
      const match = workspaces.find((w) => (w._id || w.id) === board.workspaceId);
      if (match) return { _id: match._id || match.id, name: match.name, color: match.color };
    }
    return null;
  };

  const getTaskListName = (task: Task): string => {
    if (typeof task.listId === 'object' && task.listId !== null) {
      return task.listId.name || task.listId.title || 'In Board';
    }
    if (task.status === 'done') return 'Done';
    return task.status || 'Active';
  };

  // Filtered and sorted tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const titleMatch = task.title.toLowerCase().includes(q);
        const descMatch = task.description?.toLowerCase().includes(q);
        const board = getTaskBoard(task);
        const boardMatch = board?.name.toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !boardMatch) return false;
      }

      // Workspace filter
      if (selectedWorkspace !== 'all') {
        const board = getTaskBoard(task);
        const wsId = typeof board?.workspaceId === 'object' ? board?.workspaceId?._id : board?.workspaceId;
        if (wsId !== selectedWorkspace) return false;
      }

      // Priority filter
      if (selectedPriority !== 'all' && task.priority !== selectedPriority) {
        return false;
      }

      // Status filter
      if (selectedStatus === 'done' && task.status !== 'done') return false;
      if (selectedStatus === 'active' && task.status === 'done') return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      }
      if (sortBy === 'oldest') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      }
      if (sortBy === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === 'priority') {
        const pOrder: Record<PriorityLevel, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
        return (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  }, [tasks, search, selectedWorkspace, selectedPriority, selectedStatus, sortBy, workspaces]);

  // Summary statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const highOrUrgent = tasks.filter((t) => t.priority === 'urgent' || t.priority === 'high').length;
    const completed = tasks.filter((t) => t.status === 'done').length;
    const active = total - completed;
    return { total, highOrUrgent, completed, active };
  }, [tasks]);

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400">
                  <Icon name="file-plus" size={20} />
                </span>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 font-display">
                    My Created Tasks
                  </h1>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    All tasks created by you across your accessible workspaces.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => refetch()}
                className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition cursor-pointer"
                title="Refresh tasks"
              >
                <Icon name="history" size={16} />
              </button>
            </div>
          </div>
        </header>

        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Stats Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
              <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                Total Created
              </p>
              <p className="text-2xl font-black text-neutral-900 dark:text-neutral-100 mt-1 font-display">
                {stats.total}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
              <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                In Progress
              </p>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 font-display">
                {stats.active}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
              <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                High / Urgent
              </p>
              <p className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-1 font-display">
                {stats.highOrUrgent}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
              <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                Completed
              </p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-display">
                {stats.completed}
              </p>
            </div>
          </div>

          {/* Search and Filters Toolbar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Icon
                  name="search"
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  type="text"
                  placeholder="Search by title, description, or board…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-9 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-0.5"
                  >
                    <Icon name="x" size={14} />
                  </button>
                )}
              </div>

              {/* Workspace Filter Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedWorkspace}
                  onChange={(e) => setSelectedWorkspace(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value="all">All Workspaces</option>
                  {workspaces.map((ws) => (
                    <option key={ws._id || ws.id} value={ws._id || ws.id}>
                      {ws.name}
                    </option>
                  ))}
                </select>

                {/* Priority Filter Dropdown */}
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                {/* Sort By Dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value="newest">Sort: Newest</option>
                  <option value="oldest">Sort: Oldest</option>
                  <option value="dueDate">Sort: Due Date</option>
                  <option value="priority">Sort: Priority</option>
                  <option value="title">Sort: Alphabetical</option>
                </select>
              </div>
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1.5 pt-1 border-t border-neutral-100 dark:border-neutral-800">
              <span className="text-[11px] font-semibold text-neutral-400 mr-1">Status:</span>
              <button
                type="button"
                onClick={() => setSelectedStatus('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedStatus === 'all'
                    ? 'bg-orange-500 text-white shadow-2xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                All ({tasks.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('active')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedStatus === 'active'
                    ? 'bg-orange-500 text-white shadow-2xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                Active ({stats.active})
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('done')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedStatus === 'done'
                    ? 'bg-orange-500 text-white shadow-2xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                Done ({stats.completed})
              </button>
            </div>
          </div>

          {/* Task Content List */}
          {isLoading ? (
            /* Loading Skeleton */
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 animate-pulse flex items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-1/3" />
                    <div className="h-3 bg-neutral-100 dark:bg-neutral-800/60 rounded w-1/2" />
                  </div>
                  <div className="h-6 bg-neutral-200 dark:bg-neutral-800 rounded w-24" />
                </div>
              ))}
            </div>
          ) : isError ? (
            /* Error State */
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-rose-200 dark:border-rose-900/50 space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-500 mx-auto flex items-center justify-center">
                <Icon name="alert-circle" size={24} />
              </div>
              <h3 className="font-bold text-neutral-800 dark:text-neutral-200">Failed to load created tasks</h3>
              <p className="text-xs text-neutral-500">There was a network or server error loading your tasks.</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : tasks.length === 0 ? (
            /* Empty State: No created tasks */
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-neutral-900 border border-dashed border-neutral-200 dark:border-neutral-800 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-500/10 text-orange-500 mx-auto flex items-center justify-center shadow-inner">
                <Icon name="file-plus" size={32} />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 font-display">
                  You haven't created any tasks yet
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Tasks you create inside boards will be automatically listed here for quick tracking and management.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/boards')}
                className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md shadow-orange-500/20"
              >
                Browse Boards
              </button>
            </div>
          ) : filteredTasks.length === 0 ? (
            /* Empty State: No search results */
            <div className="p-10 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mx-auto flex items-center justify-center">
                <Icon name="filter" size={20} />
              </div>
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                No matching created tasks found
              </p>
              <p className="text-xs text-neutral-400">
                Try adjusting your search query or removing active filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedWorkspace('all');
                  setSelectedPriority('all');
                  setSelectedStatus('all');
                }}
                className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-semibold rounded-xl text-neutral-700 dark:text-neutral-200 transition cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            /* Task Rows List */
            <div className="space-y-2.5">
              {filteredTasks.map((task) => {
                const priorityMeta = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                const board = getTaskBoard(task);
                const workspace = getTaskWorkspace(task);
                const listName = getTaskListName(task);
                const isTaskOverdue = task.dueDate && isOverdue(task.dueDate) && task.status !== 'done';
                const boardIdStr = board ? (typeof board === 'object' ? board._id : String(board)) : '';

                // Assignees info
                const assigneesList: TaskAssigneeUser[] = Array.isArray(task.assignees)
                  ? (task.assignees.filter((a) => typeof a === 'object' && a !== null) as TaskAssigneeUser[])
                  : [];

                // Checklists count
                const checklistItems = Array.isArray(task.checklist) ? task.checklist : [];
                const doneChecklist = checklistItems.filter((i) => i.isDone).length;

                // Attachment count
                const attCount = typeof task.attachments === 'number' ? task.attachments : Array.isArray(task.attachments) ? task.attachments.length : 0;

                return (
                  <div
                    key={task._id || task.id}
                    onClick={() => handleOpenTask(task)}
                    className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800/90 hover:border-orange-500/40 dark:hover:border-orange-500/30 hover:shadow-md transition-all cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-3.5"
                  >
                    {/* Left: Priority + Title + Description + Tags */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Priority Dot Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold uppercase tracking-wider shrink-0 mt-0.5 ${priorityMeta.bg} ${priorityMeta.text}`}
                      >
                        {priorityMeta.label}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors truncate">
                            {task.title}
                          </h4>
                          {task.status === 'done' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                              Completed
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                            {task.description}
                          </p>
                        )}

                        {/* Metadata Pills: Workspace, Board, Column, Labels, Checklists, Attachments */}
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                          {workspace && (
                            <span className="flex items-center gap-1 font-semibold text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                              {workspace.name}
                            </span>
                          )}

                          {board && (
                            <span className="flex items-center gap-1 font-medium bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                              <Icon name="barChart" size={11} className="text-neutral-400" />
                              {board.name}
                            </span>
                          )}

                          <span className="flex items-center gap-1 font-medium bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md text-neutral-600 dark:text-neutral-400">
                            <Icon name="list" size={11} className="text-neutral-400" />
                            {listName}
                          </span>

                          {checklistItems.length > 0 && (
                            <span className="flex items-center gap-1 font-medium text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-md">
                              <Icon name="check-square" size={11} />
                              {doneChecklist}/{checklistItems.length}
                            </span>
                          )}

                          {attCount > 0 && (
                            <span className="flex items-center gap-1 font-medium text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-md">
                              <Icon name="paperclip" size={11} />
                              {attCount}
                            </span>
                          )}

                          {Array.isArray(task.labels) &&
                            task.labels.map((lbl, idx) => {
                              const meta = getLabelMeta(lbl as Label);
                              return (
                                <span
                                  key={(lbl as Label)._id || idx}
                                  className={`px-1.5 py-0.2 rounded font-semibold text-[10px] ${meta.style}`}
                                >
                                  {meta.name}
                                </span>
                              );
                            })}
                        </div>
                      </div>
                    </div>

                    {/* Right: Due date + Assignees + Board Quick Link */}
                    <div className="flex items-center gap-4 shrink-0 md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-neutral-100 dark:border-neutral-800">
                      {/* Due Date */}
                      {task.dueDate && (
                        <div
                          className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-xl shrink-0 ${
                            isTaskOverdue
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                          }`}
                        >
                          <Icon name="clock" size={12} />
                          <span>{formatDate(task.dueDate)}</span>
                        </div>
                      )}

                      {/* Assignees Stack */}
                      {assigneesList.length > 0 ? (
                        <div className="flex items-center -space-x-1.5">
                          {assigneesList.slice(0, 3).map((u, i) => (
                            <Avatar key={u._id || i} name={u.fullName || u.name || 'Member'} size={24} ring={false} />
                          ))}
                          {assigneesList.length > 3 && (
                            <span className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-[10px] font-bold flex items-center justify-center">
                              +{assigneesList.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-400 italic">Unassigned</span>
                      )}

                      {/* Go to Board Action Button */}
                      {boardIdStr && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/boards/${boardIdStr}`);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-orange-500 hover:text-orange-500 dark:hover:text-orange-400 transition flex items-center gap-1 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                          title="Open Board in Kanban view"
                        >
                          <span>Board</span>
                          <Icon name="chevron-right" size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Task Details Drawer */}
        <TaskDrawer
          task={drawerTask}
          onClose={() => setDrawerTask(null)}
          onEdit={() => {}}
          columns={drawerColumns}
          workspaceId={
            drawerTask
              ? typeof drawerTask.workspaceId === 'object' && drawerTask.workspaceId !== null
                ? drawerTask.workspaceId._id
                : typeof drawerTask.workspaceId === 'string'
                ? drawerTask.workspaceId
                : currentWorkspace?._id || currentWorkspace?.id
              : undefined
          }
          boardId={
            drawerTask
              ? typeof drawerTask.boardId === 'object' && drawerTask.boardId !== null
                ? drawerTask.boardId._id
                : drawerTask.boardId
              : undefined
          }
        />
      </main>
    </div>
  );
};

export default CreatedTasksPage;
