import { Workspace } from './workspace.model.js';
import { WorkspaceInvite } from './workspaceInvite.model.js';

class WorkspaceRepository {
  /**
   * Create a new workspace.
   */
  async createWorkspace(workspaceData) {
    return Workspace.create(workspaceData);
  }

  /**
   * Find a workspace by ID (excluding soft-deleted ones).
   * Populates ownerId and members.userId with fullName and email.
   */
  async findWorkspaceById(id) {
    return Workspace.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate('ownerId', 'fullName email')
      .populate('members.userId', 'fullName email')
      .exec();
  }

  /**
   * Find a workspace by slug (excluding soft-deleted ones).
   */
  async findWorkspaceBySlug(slug) {
    return Workspace.findOne({ slug, isDeleted: { $ne: true } }).exec();
  }

  /**
   * List all workspaces a user belongs to (excluding soft-deleted ones).
   * Populates ownerId and members.userId.
   */
  async listWorkspacesForUser(userId, options = {}) {
    const { page, limit, view } = options;

    const query = {
      $or: [
        { ownerId: userId },
        { 'members.userId': userId }
      ],
      isDeleted: { $ne: true }
    };

    if (page === undefined || limit === undefined) {
      let builder = Workspace.find(query);
      if (view === 'compact') {
        builder = builder.select('_id slug name logoUrl');
      } else {
        builder = builder.populate('ownerId', 'fullName email')
          .populate('members.userId', 'fullName email');
      }
      return builder.sort({ createdAt: -1 }).exec();
    }

    const skip = (page - 1) * limit;
    const totalItems = await Workspace.countDocuments(query);

    let builder = Workspace.find(query);
    if (view === 'compact') {
      builder = builder.select('_id slug name logoUrl');
    } else {
      builder = builder.populate('ownerId', 'fullName email')
        .populate('members.userId', 'fullName email');
    }

    const workspaces = await builder
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return {
      workspaces,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        limit
      }
    };
  }

  /**
   * Update a workspace.
   */
  async updateWorkspace(id, updateData) {
    return Workspace.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      updateData,
      { new: true, runValidators: true }
    )
      .populate('ownerId', 'fullName email')
      .populate('members.userId', 'fullName email')
      .exec();
  }

  /**
   * Soft-delete a workspace by setting isDeleted to true and deletedAt.
   */
  async softDeleteWorkspace(id) {
    return Workspace.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      {
        isDeleted: true,
        deletedAt: new Date()
      },
      { new: true }
    ).exec();
  }

  // ==========================================
  // Workspace Invite Operations
  // ==========================================

  /**
   * Create a new workspace invitation.
   */
  async createInvite(inviteData) {
    return WorkspaceInvite.create(inviteData);
  }

  /**
   * Find an active pending invitation by token (excluding soft-deleted ones).
   */
  async findInviteByToken(token) {
    return WorkspaceInvite.findOne({
      token,
      status: 'pending',
      isDeleted: { $ne: true },
      expiresAt: { $gt: new Date() }
    }).exec();
  }

  /**
   * Find an invitation by ID and workspace ID (excluding soft-deleted ones).
   */
  async findInviteByIdAndWorkspace(inviteId, workspaceId) {
    return WorkspaceInvite.findOne({
      _id: inviteId,
      workspaceId,
      isDeleted: { $ne: true }
    }).exec();
  }

  /**
   * Find an active pending invitation for a specific workspace and email.
   */
  async findPendingInviteByWorkspaceAndEmail(workspaceId, email) {
    return WorkspaceInvite.findOne({
      workspaceId,
      email: email.toLowerCase(),
      status: 'pending',
      isDeleted: { $ne: true },
      expiresAt: { $gt: new Date() }
    }).exec();
  }

  /**
   * List all pending non-expired invitations for a workspace.
   */
  async listPendingInvites(workspaceId) {
    return WorkspaceInvite.find({
      workspaceId,
      status: 'pending',
      isDeleted: { $ne: true },
      expiresAt: { $gt: new Date() }
    })
      .populate('invitedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Soft-delete an invitation.
   */
  async softDeleteInvite(inviteId) {
    return WorkspaceInvite.findByIdAndUpdate(
      inviteId,
      {
        isDeleted: true,
        deletedAt: new Date()
      },
      { new: true }
    ).exec();
  }
}

export default new WorkspaceRepository();
