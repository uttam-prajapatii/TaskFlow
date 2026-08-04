/**
 * Helper to safely extract string ID from Mongoose object or string.
 */
export const getStrId = (val) => (val?._id ? val._id.toString() : (val?.toString() || ''));

/**
 * Check the user's role in the workspace.
 * Returns 'owner', 'admin', 'member', 'viewer', or null if not a member.
 */
export function getWorkspaceRole(workspace, userId) {
  if (!workspace || !userId) return null;

  const userStrId = getStrId(userId);
  const ownerStrId = getStrId(workspace.ownerId);

  if (ownerStrId === userStrId) {
    return 'owner';
  }

  const member = workspace.members.find(
    (m) => m.userId && getStrId(m.userId) === userStrId
  );

  return member ? member.role : null;
}

/**
 * Check if the role matches workspace admin permissions (owner or admin).
 */
export const isWorkspaceAdmin = (role) => role === 'owner' || role === 'admin';

/**
 * Check if the role matches workspace member permissions (owner, admin, or member).
 */
export const isWorkspaceMember = (role) => role === 'owner' || role === 'admin' || role === 'member';

/**
 * Check if the role matches workspace viewer permissions (any valid workspace role).
 */
export const isWorkspaceViewer = (role) => role === 'owner' || role === 'admin' || role === 'member' || role === 'viewer';

/**
 * Checks if the board visibility permits the user to view it.
 * - 'workspace' visibility is open to all workspace members.
 * - 'private' visibility is restricted to board creator and workspace admins (owner/admin).
 */
export function canViewBoard({ board, userRole, userId }) {
  if (!board) return false;

  // Workspace Admins / Owners can view all boards
  if (isWorkspaceAdmin(userRole)) {
    return true;
  }

  // Private boards can only be viewed by their creator
  if (board.visibility === 'private') {
    return getStrId(board.createdBy) === getStrId(userId);
  }

  // Workspace-visible boards can be viewed by any workspace member (viewer or above)
  return isWorkspaceViewer(userRole);
}

/**
 * Checks if user is permitted to update the board (Creator of board with Member role, or Workspace Admin/Owner).
 */
export function canUpdateBoard({ board, userRole, userId }) {
  if (!board) return false;

  // Workspace Admins / Owners can update all boards
  if (isWorkspaceAdmin(userRole)) {
    return true;
  }

  // Board creators with Member role can update the board
  if (userRole === 'member') {
    return getStrId(board.createdBy) === getStrId(userId);
  }

  return false;
}
