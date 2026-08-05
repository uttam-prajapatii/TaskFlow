import { getWorkspaceRole, canViewBoard } from '../board/board.utils.js';

/**
 * Validates and retrieves access rights for tasks on a board and workspace.
 * Returns: { role, canView, canWrite }
 * - canView: User must have a workspace role and be allowed to view the board (handling private board visibility rules).
 * - canWrite: User must have a member role (owner, admin, or member) and be allowed to view the board.
 */
export function getTaskAccessRights({ board, workspace, userId }) {
  const role = getWorkspaceRole(workspace, userId);
  const canView = canViewBoard({ board, userRole: role, userId });
  const isMember = role === 'owner' || role === 'admin' || role === 'member';

  return {
    role,
    canView: !!role && canView,
    canWrite: !!role && canView && isMember
  };
}

/**
 * Checks if the parent board or workspace is archived.
 */
export function isParentArchived({ board, workspace }) {
  return (board && board.isArchived) || (workspace && workspace.isArchived);
}

/**
 * Helper to safely extract string ID from Mongoose object or string.
 */
export const getStrId = (val) => (val?._id ? val._id.toString() : (val?.toString() || ''));

/**
 * Format flat tasks array into grouped-by-list response format.
 * Structure: { lists: [ { listId, listName, tasks: [ { id, title, priority, dueDate, assignees } ] } ] }
 */
export function formatGroupedTasks(lists, tasks) {
  const tasksByList = {};
  
  tasks.forEach((task) => {
    const lid = getStrId(task.listId);
    if (!tasksByList[lid]) {
      tasksByList[lid] = [];
    }
    
    // Extract assignee IDs as strings
    const assigneeIds = (task.assignees || []).map((uid) => getStrId(uid));
    
    tasksByList[lid].push({
      id: getStrId(task._id),
      title: task.title,
      priority: task.priority,
      dueDate: task.dueDate,
      assignees: assigneeIds,
      position: task.position
    });
  });

  // Sort tasks in each list by position ascending
  Object.keys(tasksByList).forEach((lid) => {
    tasksByList[lid].sort((a, b) => a.position - b.position);
  });

  return {
    lists: lists.map((list) => ({
      listId: getStrId(list._id),
      listName: list.name,
      tasks: tasksByList[getStrId(list._id)] || []
    }))
  };
}

/**
 * Maps file MIME types to Cloudinary resource types (image, video, raw).
 */
export function getCloudinaryResourceType(mimeType) {
  if (!mimeType) return 'image';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'video';
  return 'raw';
}
