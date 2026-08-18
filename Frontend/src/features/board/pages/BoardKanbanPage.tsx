import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Sidebar from '../../../components/layout/Sidebar';
import Icon from '../../../components/UI/Icon';
import Avatar from '../../../components/UI/Avatar';
import DropdownMenu, { type MenuItem } from '../../../components/UI/DropdownMenu';
import KanbanColumn from '../components/KanbanColumn';
import TaskModal from '../components/TaskModal';
import TaskDrawer from '../components/TaskDrawer';
import RenameListModal from '../components/RenameListModal';
import BoardSkeleton from '../components/BoardSkeleton';
import ConfirmModal from '../../../components/UI/ConfirmModal';
import boardService from '../../../services/board.service';
import listService from '../../../services/list.service';
import taskService from '../../../services/task.service';
import workspaceService from '../../../services/workspace.service';
import { useWorkspace } from '../../../context/WorkspaceContext';
import useSocketBoard from '../../../hooks/useSocketBoard';
import type { Board, BoardList, Task, CreateTaskPayload, PriorityLevel } from '../types';

export const BoardKanbanPage: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();

  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<Board | null>(null);
  const [isStarred, setIsStarred] = useState(false);
  const [columns, setColumns] = useState<BoardList[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // List creation state
  const [addingList, setAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [newListTitleError, setNewListTitleError] = useState<string | null>(null);
  const [creatingList, setCreatingList] = useState(false);

  // List rename modal state
  const [renameListTarget, setRenameListTarget] = useState<{ id: string; title: string } | null>(null);
  const [renamingList, setRenamingList] = useState(false);

  // List delete confirm modal state
  const [deleteListTarget, setDeleteListTarget] = useState<{ id: string; name: string } | null>(null);
  const [deletingList, setDeletingList] = useState(false);

  // Search, filter & sort state
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'position' | 'newest' | 'oldest' | 'priority' | 'dueDate' | 'alpha'>('position');

  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  // Drag state
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  // Modal / Drawer state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultColForTask, setDefaultColForTask] = useState<string | undefined>(undefined);
  const [targetPositionForTask, setTargetPositionForTask] = useState<number | undefined>(undefined);
  const [savingTask, setSavingTask] = useState(false);

  const [drawerTask, setDrawerTask] = useState<Task | null>(null);

  const loadBoardData = useCallback(async (silent = false) => {
    if (!boardId) return;
    try {
      if (!silent) setLoading(true);
      const bDetails = await boardService.getBoardDetails(boardId);
      setBoard(bDetails);
      setIsStarred(!!(bDetails as { isStarred?: boolean }).isStarred);

      try {
        const lists = await listService.getBoardLists(boardId);
        const mappedLists: BoardList[] = (lists || []).map((l: unknown, i: number) => {
          const item = l as { _id?: string; id?: string; name?: string; title?: string; boardId?: string; position?: number };
          return {
            ...item,
            _id: item._id || item.id || `list-${i}`,
            title: item.name || item.title || `List ${i + 1}`,
            boardId: item.boardId || boardId,
          };
        });
        setColumns(mappedLists);
      } catch {
        // preserve columns on minor error
      }

      try {
        const taskList = await taskService.getBoardTasks(boardId);
        setTasks(taskList);
      } catch {
        // preserve tasks on minor error
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Board not found or unavailable');
      if (!silent) {
        const remainingWs = await workspaceService.listWorkspaces().catch(() => []);
        if (remainingWs.length > 0) {
          navigate('/boards', { replace: true });
        } else {
          navigate('/onboarding', { replace: true });
        }
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [boardId, navigate]);

  // Live socket updates & watchers list
  const { watchers } = useSocketBoard(boardId, setBoard, setColumns, setTasks, loadBoardData);

  useEffect(() => {
    loadBoardData(false);
  }, [loadBoardData]);

  // Handle live changes on new list title input tag
  const handleNewListTitleChange = (val: string) => {
    setNewListTitle(val);
    if (!val.trim()) {
      setNewListTitleError('List title is required.');
    } else if (val.trim().length < 2) {
      setNewListTitleError('List title must be at least 2 characters.');
    } else if (val.length > 50) {
      setNewListTitleError('List title cannot exceed 50 characters.');
    } else {
      setNewListTitleError(null);
    }
  };

  // Create List handler with frontend validation
  const handleAddList = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newListTitle.trim();

    if (!trimmed) {
      setNewListTitleError('List title is required.');
      toast.error('List title is required.');
      return;
    }

    if (trimmed.length < 2 || trimmed.length > 50) {
      setNewListTitleError('List title must be between 2 and 50 characters.');
      toast.error('List title must be between 2 and 50 characters.');
      return;
    }

    try {
      setCreatingList(true);
      const created = await listService.createList(boardId!, { name: trimmed });
      toast.success(`List "${trimmed}" created`);

      // Optimistic update
      const newCol: BoardList = {
        _id: created?._id || created?.id || `list-${Date.now()}`,
        title: trimmed,
        boardId: boardId!,
      };
      setColumns((prev) => [...prev, newCol]);

      setNewListTitle('');
      setNewListTitleError(null);
      setAddingList(false);

      // Silent refresh without triggering full-screen skeleton loader
      loadBoardData(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to create list');
    } finally {
      setCreatingList(false);
    }
  };

  // Open theme-aware Rename List modal
  const handleRenameColumn = (columnId: string, currentName: string) => {
    setRenameListTarget({ id: columnId, title: currentName });
  };

  // Save list title from RenameListModal
  const handleSaveRenameList = async (newName: string) => {
    if (!renameListTarget) return;
    const colId = renameListTarget.id;
    try {
      setRenamingList(true);

      // Optimistic update locally
      setColumns((prev) =>
        prev.map((c) => ((c._id || c.id) === colId ? { ...c, title: newName } : c))
      );

      await listService.renameList(colId, newName);
      toast.success(`List renamed to "${newName}"`);
      setRenameListTarget(null);

      // Silent refresh without triggering skeleton loader
      loadBoardData(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to rename list');
      loadBoardData(true);
    } finally {
      setRenamingList(false);
    }
  };

  // Delete List trigger (opens ConfirmModal)
  const handleDeleteColumn = (columnId: string) => {
    const col = columns.find((c) => (c._id || c.id) === columnId);
    const colName = col?.title || 'List';
    setDeleteListTarget({ id: columnId, name: colName });
  };

  // Confirmed Delete List handler
  const handleConfirmDeleteList = async () => {
    if (!deleteListTarget) return;
    const colId = deleteListTarget.id;
    try {
      setDeletingList(true);
      // Optimistic update locally
      setColumns((prev) => prev.filter((c) => (c._id || c.id) !== colId));
      setTasks((prev) =>
        prev.filter((t) => {
          const tListId = typeof t.listId === 'object' && t.listId !== null ? (t.listId as { _id?: string })._id : t.listId;
          return String(tListId) !== String(colId) && String(t.status) !== String(colId);
        })
      );

      await listService.deleteList(colId);
      toast.success(`List "${deleteListTarget.name}" deleted`);
      setDeleteListTarget(null);

      // Silent refresh without triggering skeleton loader
      loadBoardData(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to delete list');
      loadBoardData(true);
    } finally {
      setDeletingList(false);
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    const tId = task._id || task.id!;
    setDraggingTaskId(tId);
    e.dataTransfer.setData('text/plain', tId);
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverColId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: string, targetIndex?: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggingTaskId;
    setDraggingTaskId(null);
    setDragOverColId(null);

    if (!taskId) return;

    // Filter existing tasks in destination column (excluding dropped task)
    const targetColTasks = tasks
      .filter((t) => {
        const taskListId = typeof t.listId === 'object' && t.listId !== null ? (t.listId as { _id?: string })._id : t.listId;
        return (String(taskListId) === String(targetColumnId) || String(t.status) === String(targetColumnId)) && (t._id || t.id) !== taskId;
      })
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    const safePosition = targetIndex !== undefined ? Math.max(0, Math.min(targetIndex, targetColTasks.length)) : targetColTasks.length;

    // Optimistic UI update with re-calculated position index
    setTasks((prev) => {
      const movedTask = prev.find((t) => (t._id || t.id) === taskId);
      if (!movedTask) return prev;

      const updatedMoved = { ...movedTask, status: targetColumnId, listId: targetColumnId, position: safePosition };
      const listCopy = [...targetColTasks];
      listCopy.splice(safePosition, 0, updatedMoved);

      const reindexedTarget = listCopy.map((t, idx) => ({ ...t, position: idx }));

      const otherColTasks = prev.filter((t) => {
        const taskListId = typeof t.listId === 'object' && t.listId !== null ? (t.listId as { _id?: string })._id : t.listId;
        return String(taskListId) !== String(targetColumnId) && String(t.status) !== String(targetColumnId) && (t._id || t.id) !== taskId;
      });

      return [...otherColTasks, ...reindexedTarget];
    });

    try {
      await taskService.moveTask(taskId, {
        listId: targetColumnId,
        targetListId: targetColumnId,
        position: safePosition,
        targetPosition: safePosition,
      });
      toast.success('Task position updated');
    } catch {
      // Revert on error
      loadBoardData();
    }
  };

  // Filtered & sorted task calculation
  const processedTasks = useMemo(() => {
    let list = tasks.filter((t) => {
      const query = search.toLowerCase();
      const titleMatch = t.title.toLowerCase().includes(query);
      const descMatch = (t.description || '').toLowerCase().includes(query);
      return titleMatch || descMatch;
    });

    if (filterPriority) {
      list = list.filter((t) => t.priority === filterPriority);
    }

    if (sortBy === 'position') {
      list = [...list].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    } else if (sortBy === 'newest') {
      list = [...list].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    } else if (sortBy === 'oldest') {
      list = [...list].sort(
        (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      );
    } else if (sortBy === 'alpha') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'priority') {
      const pOrder: Record<PriorityLevel, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
      list = [...list].sort((a, b) => (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0));
    }

    return list;
  }, [tasks, search, filterPriority, sortBy]);

  // Task save handler (create or edit)
  const handleSaveTask = async (payload: CreateTaskPayload) => {
    if (!boardId) return;
    try {
      setSavingTask(true);
      if (editingTask) {
        const eId = editingTask._id || editingTask.id!;
        await taskService.updateTask(eId, payload);
        toast.success('Task updated');
      } else {
        const targetListId = payload.status || defaultColForTask || columns[0]?._id;
        if (!targetListId) {
          toast.error('Please add a list to the board before adding tasks.');
          return;
        }
        await taskService.createTask(targetListId, {
          ...payload,
          ...(typeof targetPositionForTask === 'number' ? { position: targetPositionForTask } : {}),
        });
        toast.success('Task created');
      }
      setTaskModalOpen(false);
      setEditingTask(null);
      setTargetPositionForTask(undefined);
      loadBoardData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to save task');
    } finally {
      setSavingTask(false);
    }
  };

  const handleMenuAction = async (action: string, task: Task) => {
    const tId = task._id || task.id!;
    if (action === 'open') {
      setDrawerTask(task);
    } else if (action === 'edit') {
      setEditingTask(task);
      setTaskModalOpen(true);
    } else if (action === 'delete') {
      try {
        await taskService.deleteTask(tId);
        toast.success('Task deleted');
        loadBoardData();
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } } };
        toast.error(error.response?.data?.message || 'Failed to delete task');
      }
    }
  };

  const filterItems: MenuItem[] = [
    { label: 'All priorities', icon: !filterPriority ? 'check' : undefined, onClick: () => setFilterPriority(null) },
    { label: 'Urgent', icon: filterPriority === 'urgent' ? 'check' : undefined, onClick: () => setFilterPriority('urgent') },
    { label: 'High', icon: filterPriority === 'high' ? 'check' : undefined, onClick: () => setFilterPriority('high') },
    { label: 'Medium', icon: filterPriority === 'medium' ? 'check' : undefined, onClick: () => setFilterPriority('medium') },
    { label: 'Low', icon: filterPriority === 'low' ? 'check' : undefined, onClick: () => setFilterPriority('low') },
  ];

  const sortItems: MenuItem[] = [
    { label: 'Custom position', icon: sortBy === 'position' ? 'check' : undefined, onClick: () => setSortBy('position') },
    { label: 'Newest first', icon: sortBy === 'newest' ? 'check' : undefined, onClick: () => setSortBy('newest') },
    { label: 'Oldest first', icon: sortBy === 'oldest' ? 'check' : undefined, onClick: () => setSortBy('oldest') },
    { label: 'Priority', icon: sortBy === 'priority' ? 'check' : undefined, onClick: () => setSortBy('priority') },
    { label: 'Alphabetical', icon: sortBy === 'alpha' ? 'check' : undefined, onClick: () => setSortBy('alpha') },
  ];

  const handleToggleStar = async () => {
    if (!boardId) return;
    try {
      if (isStarred) {
        await boardService.unstarBoard(boardId);
        setIsStarred(false);
        toast.success('Board unstarred');
      } else {
        await boardService.starBoard(boardId);
        setIsStarred(true);
        toast.success('Board starred!');
      }
    } catch {
      toast.error('Failed to update board star status');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <Sidebar />
        <main className="flex-1 p-6 md:p-10 flex flex-col justify-center">
          <BoardSkeleton />
        </main>
      </div>
    );
  }

  if (!board) return null;

  const boardName = board?.name || board?.title || 'Kanban Board';

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans select-none">
      <Sidebar />

      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        {/* Header Bar */}
        <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 dark:border-neutral-800/80">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                {currentWorkspace?.name || 'Workspace'}
              </span>
              <span className="text-xs text-neutral-300 dark:text-neutral-700">/</span>
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {boardName}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Watchers presence list */}
              {watchers.length > 0 && (
                <div className="flex items-center gap-2 border-r border-neutral-200 dark:border-neutral-800 pr-3 mr-1">
                  <div className="flex -space-x-2 overflow-hidden">
                    {watchers.slice(0, 5).map((watcher) => (
                      <div
                        key={watcher.userId}
                        className="inline-block rounded-full ring-2 ring-white dark:ring-neutral-900 shrink-0"
                        title={`${watcher.name} is online`}
                      >
                        <Avatar
                          name={watcher.name}
                          size={24}
                        />
                      </div>
                    ))}
                  </div>
                  {watchers.length > 5 && (
                    <span className="text-xs font-semibold text-neutral-400">
                      +{watchers.length - 5}
                    </span>
                  )}
                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    {watchers.length} live
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setEditingTask(null);
                  setDefaultColForTask(columns[0]?._id || columns[0]?.id || '');
                  setTargetPositionForTask(0);
                  setTaskModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-xs shadow-orange-500/25 transition cursor-pointer"
              >
                <Icon name="plus" size={14} /> Add task
              </button>

              <Avatar name="User" size={26} />
            </div>
          </div>

          {/* Board Title & Toolbar */}
          <div className="flex flex-wrap items-center justify-between px-5 py-3 gap-3">
            <div className="flex items-center gap-2">
              <h1 className="text-[17px] font-semibold text-neutral-900 dark:text-neutral-100">
                {boardName}
              </h1>
              <button
                type="button"
                onClick={handleToggleStar}
                className="p-1 rounded-lg text-amber-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                title={isStarred ? 'Unstar board' : 'Star board'}
              >
                <Icon name="star" size={18} className={isStarred ? 'fill-amber-400 text-amber-500' : 'text-neutral-400'} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Icon
                  name="search"
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tasks…"
                  className="pl-8 pr-3 py-1.5 w-48 sm:w-56 text-[12.5px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition"
                />
              </div>

              {/* Filter */}
              <DropdownMenu
                open={filterOpen}
                setOpen={setFilterOpen}
                trigger={
                  <button
                    type="button"
                    onClick={() => setFilterOpen((v) => !v)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium border transition ${
                      filterPriority
                        ? 'border-orange-300 text-orange-600 bg-orange-50 dark:bg-orange-500/10'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <Icon name="filter" size={13} /> Filter
                  </button>
                }
                items={filterItems}
              />

              {/* Sort */}
              <DropdownMenu
                open={sortOpen}
                setOpen={setSortOpen}
                trigger={
                  <button
                    type="button"
                    onClick={() => setSortOpen((v) => !v)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                  >
                    Sort: {sortBy}
                    <Icon name="chevron-down" size={12} />
                  </button>
                }
                items={sortItems}
              />
            </div>
          </div>
        </div>

        {/* Board Columns Grid */}
        <div className="flex-1 p-5 overflow-x-auto">
          {columns.length === 0 && !addingList ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="w-full max-w-md p-10 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl bg-white/80 dark:bg-neutral-900/80 shadow-xs flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-500/10 text-orange-500 flex items-center justify-center mb-4 shadow-2xs">
                  <Icon name="plus" size={26} />
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
                  No lists in this board
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 max-w-xs leading-relaxed">
                  Get started by adding your first column (e.g. Todo, In Progress, Done).
                </p>
                <button
                  type="button"
                  onClick={() => setAddingList(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-orange-500/25 transition cursor-pointer flex items-center gap-2"
                >
                  <Icon name="plus" size={15} /> Add list
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 h-full items-start">
              {columns.map((col) => {
                const colId = col._id || col.id!;
                const colTasks = processedTasks.filter((t) => {
                  const taskListId = typeof t.listId === 'object' && t.listId !== null ? (t.listId as { _id?: string })._id : t.listId;
                  return String(taskListId) === String(colId) || String(t.status) === String(colId);
                });

                return (
                  <KanbanColumn
                    key={colId}
                    column={col}
                    tasks={colTasks}
                    onOpenTask={(task) => setDrawerTask(task)}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDrop={handleDrop}
                    draggingTaskId={draggingTaskId}
                    dragOverColId={dragOverColId}
                    onDragOverCol={(cId) => setDragOverColId(cId)}
                    onAddTask={(cId, targetPos) => {
                      setEditingTask(null);
                      setDefaultColForTask(cId);
                      setTargetPositionForTask(targetPos);
                      setTaskModalOpen(true);
                    }}
                    onMenuAction={handleMenuAction}
                    onRenameColumn={handleRenameColumn}
                    onDeleteColumn={handleDeleteColumn}
                  />
                );
              })}

              {/* Inline Add List Form / Trigger Button */}
              <div className="w-[280px] shrink-0">
                {addingList ? (
                  <form
                    onSubmit={handleAddList}
                    className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3.5 shadow-sm"
                  >
                    <div className="relative mb-2">
                      <input
                        autoFocus
                        type="text"
                        maxLength={50}
                        placeholder="Enter list title…"
                        value={newListTitle}
                        onChange={(e) => handleNewListTitleChange(e.target.value)}
                        className={`w-full px-3 py-2 pr-12 text-xs rounded-xl border bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 outline-none transition ${
                          newListTitleError
                            ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                            : 'border-neutral-200 dark:border-neutral-700 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20'
                        }`}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10.5px] font-medium text-neutral-400">
                        {newListTitle.length}/50
                      </span>
                    </div>

                    {newListTitleError && (
                      <p className="text-[11px] font-semibold text-rose-500 mb-2 flex items-center gap-1">
                        <Icon name="alert-circle" size={12} /> {newListTitleError}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={creatingList || !!newListTitleError || !newListTitle.trim()}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-xs font-semibold hover:from-orange-600 hover:to-orange-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                      >
                        {creatingList ? 'Adding…' : 'Add list'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddingList(false);
                          setNewListTitle('');
                          setNewListTitleError(null);
                        }}
                        className="px-3 py-1.5 text-neutral-500 text-xs font-semibold hover:text-neutral-800 dark:hover:text-neutral-200 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  columns.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setAddingList(true)}
                      className="w-full flex items-center justify-center gap-2 py-1.5 px-3.5 rounded-xl border border-dashed border-neutral-300/80 dark:border-neutral-800 hover:border-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-500/10 text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 text-xs font-semibold transition-all cursor-pointer bg-white/50 dark:bg-neutral-900/40 h-[34px] shadow-2xs mb-2.5"
                    >
                      <Icon name="plus" size={15} /> Add another list
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Task Modal */}
      <TaskModal
        open={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        initial={editingTask}
        columns={columns}
        defaultColumnId={defaultColForTask}
        saving={savingTask}
        workspaceId={typeof board?.workspaceId === 'object' && board?.workspaceId !== null ? board.workspaceId._id : board?.workspaceId}
        boardId={boardId}
      />

      {/* Task Detail Drawer */}
      <TaskDrawer
        task={drawerTask}
        onClose={() => setDrawerTask(null)}
        onEdit={(task) => {
          setDrawerTask(null);
          setEditingTask(task);
          setTaskModalOpen(true);
        }}
        columns={columns}
        workspaceId={typeof board?.workspaceId === 'object' && board?.workspaceId !== null ? board.workspaceId._id : board?.workspaceId}
        boardId={boardId}
      />

      {/* Rename List Modal */}
      <RenameListModal
        open={!!renameListTarget}
        currentTitle={renameListTarget?.title || ''}
        onClose={() => setRenameListTarget(null)}
        onSave={handleSaveRenameList}
        saving={renamingList}
      />

      {/* Delete List Confirm Modal */}
      <ConfirmModal
        target={deleteListTarget}
        mode="delete"
        itemType="list"
        title="Delete List"
        working={deletingList}
        onClose={() => setDeleteListTarget(null)}
        onConfirm={handleConfirmDeleteList}
      />
    </div>
  );
};

export default BoardKanbanPage;
