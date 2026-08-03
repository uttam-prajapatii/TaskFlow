import { Workspace } from './workspace.model.js';

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
        builder = builder.select('_id slug name');
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
      builder = builder.select('_id slug name');
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
}

export default new WorkspaceRepository();
