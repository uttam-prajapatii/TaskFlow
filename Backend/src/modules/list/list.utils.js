import {
  getWorkspaceRole,
  canViewBoard,
  canUpdateBoard
} from '../board/board.utils.js';

/**
 * Validates and retrieves access rights for a board and workspace.
 * Returns: { role, canView, canWrite }
 */
export function getListAccessRights({ board, workspace, userId }) {
  const role = getWorkspaceRole(workspace, userId);
  const canView = canViewBoard({ board, userRole: role, userId });
  const canWrite = canUpdateBoard({ board, userRole: role, userId });

  return {
    role,
    canView: !!role && canView,
    canWrite: !!role && canWrite
  };
}

/**
 * Checks if the parent board or workspace is archived.
 */
export function isParentArchived({ board, workspace }) {
  return (board && board?.isArchived) || (workspace && workspace?.isArchived);
}
