import crypto from 'crypto';
import mongoose from 'mongoose';
import workspaceRepository from './workspace.repository.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors.js';

/**
 * Utility to convert name into a slug format.
 */
function slugify(text) {
let str = text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w-]+/g, '')     // Remove non-word chars
    .replace(/-+/g, '-');        // Collapse multiple -

// Trim leading/trailing dashes (no regex)
let start = 0;
let end = str.length;

while (start < end && str[start] === '-') start++;
while (end > start && str[end - 1] === '-') end--;

return str.slice(start, end);
}


/**
 * Generate a unique slug, appending a short random hex string if a collision occurs.
 */
async function generateUniqueSlug(name) {
  let slug = slugify(name);
  if (!slug) {
    slug = 'workspace';
  }

  const existing = await workspaceRepository.findWorkspaceBySlug(slug);
  if (!existing) {
    return slug;
  }

  const suffix = crypto.randomBytes(3).toString('hex'); // 6 hex characters
  return `${slug}-${suffix}`;
}

class WorkspaceService {
  /**
   * Create a new workspace.
   * Creator user is assigned as the owner, and also added to the members list with the 'admin' role.
   */
  async createWorkspace(userId, { name, description, settings }) {
    const slug = await generateUniqueSlug(name);
    const workspaceData = {
      name,
      slug,
      description: description || '',
      ownerId: userId,
      members: [
        {
          userId,
          role: 'admin',
          joinedAt: new Date()
        }
      ],
      settings: settings || {}
    };

    return workspaceRepository.createWorkspace(workspaceData);
  }

  /**
   * List all workspaces a user belongs to.
   */
  async listWorkspaces(userId, options = {}) {
    return workspaceRepository.listWorkspacesForUser(userId, options);
  }

  /**
   * Get details of a single workspace.
   * User must be the owner or a member (viewer role or higher) to access.
   */
  async getWorkspaceDetails(workspaceId, userId) {
    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
      throw new BadRequestError('Invalid workspace ID format');
    }

    const workspace = await workspaceRepository.findWorkspaceById(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    // Helper to get string ID
    const getStrId = (val) => (val?._id ? val._id.toString() : (val?.toString() || ''));
    const ownerStrId = getStrId(workspace.ownerId);
    const userStrId = userId.toString();

    const isOwner = ownerStrId === userStrId;
    const isMember = workspace.members.some(
      (m) => m.userId && getStrId(m.userId) === userStrId
    );

    if (!isOwner && !isMember) {
      throw new ForbiddenError('You do not have access to this workspace');
    }

    return workspace;
  }

  /**
   * Update workspace details (name, description, settings).
   * User must be the owner or have the 'admin' role in the members list.
   */
  async updateWorkspace(workspaceId, userId, updateData) {
    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
      throw new BadRequestError('Invalid workspace ID format');
    }

    const workspace = await workspaceRepository.findWorkspaceById(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const getStrId = (val) => (val?._id ? val._id.toString() : (val?.toString() || ''));
    const ownerStrId = getStrId(workspace.ownerId);
    const userStrId = userId.toString();

    const isOwner = ownerStrId === userStrId;
    const isAdmin = workspace.members.some(
      (m) => m.role === 'admin' && m.userId && getStrId(m.userId) === userStrId
    );

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('Only workspace admins or owners can update the workspace');
    }

    const allowedUpdates = {};
    if (updateData.name !== undefined) {
      allowedUpdates.name = updateData.name;
    }
    if (updateData.description !== undefined) {
      allowedUpdates.description = updateData.description;
    }
    if (updateData.settings !== undefined) {
      allowedUpdates.settings = {
        ...workspace.settings,
        ...updateData.settings
      };
    }

    return workspaceRepository.updateWorkspace(workspaceId, allowedUpdates);
  }

  /**
   * Soft-delete (archive) a workspace.
   * Only the owner is permitted to perform this action.
   */
  async softDeleteWorkspace(workspaceId, userId) {
    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
      throw new BadRequestError('Invalid workspace ID format');
    }

    const workspace = await workspaceRepository.findWorkspaceById(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const getStrId = (val) => (val?._id ? val._id.toString() : (val?.toString() || ''));
    const ownerStrId = getStrId(workspace.ownerId);
    const userStrId = userId.toString();

    if (ownerStrId !== userStrId) {
      throw new ForbiddenError('Only the workspace owner can delete this workspace');
    }

    await workspaceRepository.softDeleteWorkspace(workspaceId);
    return { message: 'Workspace deleted successfully' };
  }
}

export default new WorkspaceService();
