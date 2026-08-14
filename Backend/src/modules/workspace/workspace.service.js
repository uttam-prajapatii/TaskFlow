import mongoose from 'mongoose';
import workspaceRepository from './workspace.repository.js';
import User from '../auth/user.model.js';
import { generateUniqueSlug, getStrId, generateRandomToken } from './workspace.utils.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';
import { enqueueEmail } from '../email/email.queue.js';
import boardRepository from '../board/board.repository.js';
import listRepository from '../list/list.repository.js';
import taskRepository from '../task/task.repository.js';
import { ActivityLog } from '../activityLog/activityLog.model.js';

class WorkspaceService {
  /**
   * Create a new workspace.
   * Creator user is assigned as the owner, and also added to the members list with the 'admin' role.
   */
  async createWorkspace(userId, { name, description, settings, accentColor }) {
    const existingByName = await workspaceRepository.findWorkspaceByNameAndOwner(name, userId);
    if (existingByName) {
      throw new BadRequestError('A workspace with this name already exists');
    }
    const slug = await generateUniqueSlug(name);
    const workspaceData = {
      name,
      slug,
      description: description || '',
      ownerId: userId,
      accentColor: accentColor,
      members: [
        {
          userId,
          role: 'admin',
          joinedAt: new Date()
        }
      ],
      settings: settings || {}
    };

    const workspace = await workspaceRepository.createWorkspace(workspaceData);
    logger.info(`Workspace created successfully: ${name} (${slug})`, { workspaceId: workspace._id, ownerId: userId });
    return workspace;
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
    const workspace = await workspaceRepository.findWorkspaceByIdOrSlug(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }


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
    const workspace = await workspaceRepository.findWorkspaceByIdOrSlug(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }


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
      const trimmedName = updateData.name.trim();
      const existingByName = await workspaceRepository.findWorkspaceByNameAndOwner(trimmedName, workspace.ownerId);
      if (existingByName && existingByName._id.toString() !== workspace._id.toString()) {
        throw new BadRequestError('A workspace with this name already exists');
      }

      if (trimmedName !== workspace.name) {
        allowedUpdates.name = trimmedName;
        allowedUpdates.slug = await generateUniqueSlug(trimmedName);
      }
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
    if (updateData.accentColor !== undefined) {
      allowedUpdates.accentColor = updateData.accentColor;
    }

    const updatedWorkspace = await workspaceRepository.updateWorkspace(workspace._id, allowedUpdates);
    logger.info(`Workspace updated`, { workspaceId: workspace._id, updatedBy: userId, updatedFields: Object.keys(allowedUpdates) });
    return updatedWorkspace;
  }

  /**
   * Upload logo for a workspace.
   * Only owner or admins of the workspace are allowed.
   */
  async uploadLogo(workspaceId, userId, file) {
    const workspace = await workspaceRepository.findWorkspaceByIdOrSlug(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const ownerStrId = getStrId(workspace.ownerId);
    const userStrId = userId.toString();

    const isOwner = ownerStrId === userStrId;
    const isAdmin = workspace.members.some(
      (m) => m.role === 'admin' && m.userId && getStrId(m.userId) === userStrId
    );

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('Only workspace admins or owners can update the logo');
    }

    if (!file) {
      throw new BadRequestError('Logo file is required');
    }

    const { uploadStream } = await import('../../config/cloudinary.js');
    const uploadResult = await uploadStream(file.buffer, {
      folder: 'taskflow/workspaces',
      public_id: `workspace_${workspace._id}_logo`
    });

    const logoUrl = uploadResult.secure_url;
    const updatedWorkspace = await workspaceRepository.updateWorkspace(workspace._id, { logoUrl });
    logger.info(`Workspace logo updated`, { workspaceId: workspace._id, updatedBy: userId, logoUrl });

    return updatedWorkspace;
  }

  /**
   * Soft-delete (archive) a workspace.
   * Only the owner is permitted to perform this action.
   */
  async softDeleteWorkspace(workspaceId, userId) {
    const workspace = await workspaceRepository.findWorkspaceByIdOrSlug(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }


    const ownerStrId = getStrId(workspace.ownerId);
    const userStrId = userId.toString();

    if (ownerStrId !== userStrId) {
      throw new ForbiddenError('Only the workspace owner can delete this workspace');
    }

    await workspaceRepository.softDeleteWorkspace(workspace._id);
    logger.info(`Workspace soft deleted`, { workspaceId: workspace._id, deletedBy: userId });
    return { message: 'Workspace deleted successfully' };
  }

  /**
   * List all members of a workspace (excluding soft-deleted workspace).
   * Accessible by viewers or higher.
   */
  async listMembers(workspaceId, userId) {
    const workspace = await workspaceRepository.findWorkspaceByIdOrSlug(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const ownerStrId = getStrId(workspace.ownerId);
    const userStrId = userId.toString();

    const isOwner = ownerStrId === userStrId;
    const isMember = workspace.members.some(
      (m) => m.userId && getStrId(m.userId) === userStrId
    );

    if (!isOwner && !isMember) {
      throw new ForbiddenError('You do not have access to this workspace');
    }

    return workspace.members;
  }

  /**
   * Invite a new member via email.
   * Creator/Inviter must be owner or admin.
   */
  async inviteMember(workspaceId, userId, { email, role, inviteExpiryDays }) {
    const workspace = await workspaceRepository.findWorkspaceByIdOrSlug(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const ownerStrId = getStrId(workspace.ownerId);
    const userStrId = userId.toString();

    const isOwner = ownerStrId === userStrId;
    const isAdmin = workspace.members.some(
      (m) => m.role === 'admin' && m.userId && getStrId(m.userId) === userStrId
    );

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('Only workspace admins or owners can invite members');
    }

    const targetEmail = email.trim().toLowerCase();

    // Check if target is already a member
    const user = await User.findOne({ email: targetEmail });
    if (user) {
      const isMember = workspace.members.some(
        (m) => m.userId && getStrId(m.userId) === user._id.toString()
      );
      if (isMember) {
        throw new BadRequestError('User is already a member of this workspace');
      }
    }

    // Determine invitation expiry
    const expiryDays = inviteExpiryDays !== undefined ? inviteExpiryDays : (workspace.settings.inviteExpiryDays || 7);
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    // Cancel / Soft-delete existing pending invitation to same email if exists
    const existingInvite = await workspaceRepository.findPendingInviteByWorkspaceAndEmail(workspace._id, targetEmail);
    if (existingInvite) {
      await workspaceRepository.softDeleteInvite(existingInvite._id);
    }

    const token = generateRandomToken();
    const invite = await workspaceRepository.createInvite({
      workspaceId: workspace._id,
      email: targetEmail,
      role: role || 'member',
      invitedBy: userId,
      token,
      expiresAt
    });

    // Enqueue workspace invitation email job
    try {
      await enqueueEmail('sendInvite', {
        toEmail: targetEmail,
        workspaceName: workspace.name,
        inviteToken: token,
      });
    } catch (emailError) {
      logger.error(`Failed to enqueue workspace invitation email to ${targetEmail}: ${emailError.message}`, {
        workspaceId: workspace._id,
        inviteId: invite._id,
      });
    }

    logger.info(`Member invitation created: ${targetEmail}`, { workspaceId: workspace._id, role: role || 'member', invitedBy: userId, inviteId: invite._id });
    return invite;
  }

  /**
   * List all pending non-expired invitations for a workspace.
   * Creator must be owner or admin.
   */
  async listPendingInvites(workspaceId, userId) {
    const workspace = await workspaceRepository.findWorkspaceByIdOrSlug(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const ownerStrId = getStrId(workspace.ownerId);
    const userStrId = userId.toString();

    const isOwner = ownerStrId === userStrId;
    const isAdmin = workspace.members.some(
      (m) => m.role === 'admin' && m.userId && getStrId(m.userId) === userStrId
    );

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('Only workspace admins or owners can view pending invitations');
    }

    return workspaceRepository.listPendingInvites(workspace._id);
  }

  /**
   * Get public details of an invitation by its token.
   */
  async getInviteDetails(token) {
    if (!token) {
      throw new BadRequestError('Invitation token is required');
    }

    const invite = await workspaceRepository.findInviteByToken(token);
    if (!invite) {
      throw new NotFoundError('Invitation not found or invalid');
    }

    let computedStatus = invite.status;
    const isExpired = new Date(invite.expiresAt) < new Date();

    if (invite.isDeleted) {
      computedStatus = invite.status === 'declined' ? 'declined' : 'revoked';
    } else if (isExpired && computedStatus === 'pending') {
      computedStatus = 'expired';
    }

    const userExists = await User.exists({ email: invite.email.toLowerCase() });

    return {
      valid: computedStatus === 'pending',
      status: computedStatus,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      workspace: invite.workspaceId ? {
        _id: invite.workspaceId._id,
        name: invite.workspaceId.name,
        description: invite.workspaceId.description,
        logo: invite.workspaceId.logo || null,
      } : null,
      invitedBy: invite.invitedBy ? {
        _id: invite.invitedBy._id,
        fullName: invite.invitedBy.fullName,
        email: invite.invitedBy.email,
        avatarUrl: invite.invitedBy.avatarUrl || null,
      } : null,
      userExists: Boolean(userExists),
    };
  }

  /**
   * Decline an invitation using its secure token.
   * Invited user must be logged in/authenticated.
   */
  async declineInvite(token, authenticatedUser) {
    if (!token) {
      throw new BadRequestError('Invitation token is required');
    }

    const existingInvite = await workspaceRepository.findInviteByToken(token);
    if (!existingInvite) {
      throw new NotFoundError('Invitation not found or invalid');
    }

    if (authenticatedUser.email.toLowerCase() !== existingInvite.email.toLowerCase()) {
      throw new ForbiddenError('This invitation was sent to a different email address');
    }

    if (existingInvite.isDeleted || existingInvite.status !== 'pending' || new Date(existingInvite.expiresAt) < new Date()) {
      throw new BadRequestError('Invitation is no longer active or has already been processed');
    }

    await workspaceRepository.declineInviteByToken(token);

    logger.info(`Invitation declined`, { workspaceId: existingInvite.workspaceId?._id || existingInvite.workspaceId, email: existingInvite.email, userId: authenticatedUser._id });

    return {
      message: 'Invitation declined successfully'
    };
  }

  /**
   * Accept an invitation using its secure token.
   * Invited user must be logged in/authenticated.
   */
  async acceptInvite(token, authenticatedUser) {
    if (!token) {
      throw new BadRequestError('Invitation token is required');
    }

    // 1. Check if user already claimed this invite previously
    let invite = await workspaceRepository.claimInviteByToken(token);
    if (!invite) {
      // Check if it was already accepted by this user
      const existingInvite = await workspaceRepository.findInviteByToken(token);
      if (
        existingInvite &&
        existingInvite.status === 'accepted' &&
        existingInvite.email.toLowerCase() === authenticatedUser.email.toLowerCase()
      ) {
        const wsId = existingInvite.workspaceId?._id || existingInvite.workspaceId;
        const workspace = await workspaceRepository.findWorkspaceById(wsId);
        const isMember = workspace?.members?.some(
          (m) => m.userId && getStrId(m.userId) === authenticatedUser._id.toString()
        );
        if (isMember) {
          return {
            message: 'You have already joined this workspace',
            workspaceId: wsId,
            role: existingInvite.role,
            alreadyMember: true
          };
        }
      }

      throw new NotFoundError('Invitation is invalid, expired, or has already been accepted/revoked');
    }

    // 2. Security check: email must match
    if (authenticatedUser.email.toLowerCase() !== invite.email.toLowerCase()) {
      // Rollback invite status to 'pending' since the user wasn't authorized to claim it
      invite.status = 'pending';
      await invite.save();
      throw new ForbiddenError('This invitation was sent to a different email address');
    }

    // 3. Find workspace
    const workspace = await workspaceRepository.findWorkspaceById(invite.workspaceId);
    if (!workspace) {
      // Rollback invite status to 'pending'
      invite.status = 'pending';
      await invite.save();
      throw new NotFoundError('Workspace not found');
    }

    const userStrId = authenticatedUser._id.toString();

    // 4. Check if they are already a member
    const isMember = workspace.members.some(
      (m) => m.userId && getStrId(m.userId) === userStrId
    );
    if (isMember) {
      // Keep invite as 'accepted' since they are already members
      return {
        message: 'You are already a member of this workspace',
        workspaceId: workspace._id,
        role: invite.role,
        alreadyMember: true
      };
    }

    // 5. Add member
    workspace.members.push({
      userId: authenticatedUser._id,
      role: invite.role,
      joinedAt: new Date()
    });

    try {
      await workspace.save();
    } catch (err) {
      // Rollback invite status to 'pending' if saving workspace fails
      invite.status = 'pending';
      await invite.save();
      throw err;
    }

    logger.info(`Invitation accepted`, { workspaceId: workspace._id, role: invite.role, userId: authenticatedUser._id, inviteId: invite._id });

    return {
      message: 'Invitation accepted successfully',
      workspaceId: workspace._id,
      role: invite.role
    };
  }

  /**
   * Revoke (soft-delete) a pending invitation.
   * Creator must be owner or admin.
   */
  async revokeInvite(workspaceId, inviteId, userId) {
    if (!mongoose.Types.ObjectId.isValid(inviteId)) {
      throw new BadRequestError('Invalid invite ID format');
    }

    const workspace = await workspaceRepository.findWorkspaceByIdOrSlug(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const ownerStrId = getStrId(workspace.ownerId);
    const userStrId = userId.toString();

    const isOwner = ownerStrId === userStrId;
    const isAdmin = workspace.members.some(
      (m) => m.role === 'admin' && m.userId && getStrId(m.userId) === userStrId
    );

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('Only workspace admins or owners can revoke invitations');
    }

    const invite = await workspaceRepository.findInviteByIdAndWorkspace(inviteId, workspace._id);
    if (!invite || invite?.status !== 'pending') {
      throw new NotFoundError('Pending invitation not found');
    }

    await workspaceRepository.softDeleteInvite(inviteId);
    logger.info(`Invitation revoked`, { workspaceId: workspace._id, inviteId, revokedBy: userId });
    return { message: 'Invitation revoked successfully' };
  }

  /**
   * Change role of a member.
   * Creator must be owner or admin.
   */
  async changeMemberRole(workspaceId, callerId, targetUserId, role) {
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      throw new BadRequestError('Invalid user ID format');
    }

    const workspace = await workspaceRepository.findWorkspaceByIdOrSlug(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const ownerStrId = getStrId(workspace.ownerId);
    const callerStrId = callerId.toString();
    const targetStrId = targetUserId.toString();

    const isOwner = ownerStrId === callerStrId;
    const isAdmin = workspace.members.some(
      (m) => m.role === 'admin' && m.userId && getStrId(m.userId) === callerStrId
    );

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('Only workspace admins or owners can change member roles');
    }

    // Cannot modify own role
    if (callerStrId === targetStrId) {
      throw new BadRequestError('Cannot change your own role');
    }

    // Cannot demote owner
    if (ownerStrId === targetStrId) {
      throw new BadRequestError('Cannot change the role of the workspace owner');
    }

    // Verify target is in members
    const memberIndex = workspace.members.findIndex(
      (m) => m.userId && getStrId(m.userId) === targetStrId
    );
    if (memberIndex === -1) {
      throw new NotFoundError('Member not found in workspace');
    }

    workspace.members[memberIndex].role = role;
    await workspace.save();
    logger.info(`Member role updated`, { workspaceId: workspace._id, targetUserId, newRole: role, updatedBy: callerId });

    return workspace.members;
  }

  /**
   * Remove a member from the workspace.
   * Creator must be owner or admin.
   */
  async removeMember(workspaceId, callerId, targetUserId) {
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      throw new BadRequestError('Invalid user ID format');
    }

    const workspace = await workspaceRepository.findWorkspaceByIdOrSlug(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const ownerStrId = getStrId(workspace.ownerId);
    const callerStrId = callerId.toString();
    const targetStrId = targetUserId.toString();

    const isOwner = ownerStrId === callerStrId;
    const isAdmin = workspace.members.some(
      (m) => m.role === 'admin' && m.userId && getStrId(m.userId) === callerStrId
    );

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('Only workspace admins or owners can remove members');
    }

    // Cannot remove owner
    if (ownerStrId === targetStrId) {
      throw new BadRequestError('Cannot remove the workspace owner');
    }

    // Cannot remove self using this endpoint
    if (callerStrId === targetStrId) {
      throw new BadRequestError('Cannot remove yourself. Use the leave endpoint instead.');
    }

    // Verify target is in members
    const isMember = workspace.members.some(
      (m) => m.userId && getStrId(m.userId) === targetStrId
    );
    if (!isMember) {
      throw new NotFoundError('Member not found in workspace');
    }

    workspace.members = workspace.members.filter(
      (m) => m.userId && getStrId(m.userId) !== targetStrId
    );
    await workspace.save();
    logger.info(`Member removed from workspace`, { workspaceId: workspace._id, targetUserId, removedBy: callerId });

    return { message: 'Member removed successfully' };
  }

  /**
   * Leave a workspace self.
   */
  async leaveWorkspace(workspaceId, userId) {
    const workspace = await workspaceRepository.findWorkspaceByIdOrSlug(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const ownerStrId = getStrId(workspace.ownerId);
    const userStrId = userId.toString();

    // Verify caller is member
    const isMember = workspace.members.some(
      (m) => m.userId && getStrId(m.userId) === userStrId
    );
    if (!isMember) {
      throw new NotFoundError('You are not a member of this workspace');
    }

    // Owner cannot leave
    if (ownerStrId === userStrId) {
      throw new BadRequestError('Workspace owner cannot leave the workspace');
    }

    workspace.members = workspace.members.filter(
      (m) => m.userId && getStrId(m.userId) !== userStrId
    );
    await workspace.save();
    logger.info(`User left workspace`, { workspaceId: workspace._id, userId });

    return { message: 'You have left the workspace successfully' };
  }

  /**
   * Compute workspace analytics (task completion velocity, average cycle times, counts).
   */
  async getWorkspaceAnalytics(workspaceId, userId) {
    const workspace = await workspaceRepository.findWorkspaceByIdOrSlug(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const ownerStrId = getStrId(workspace.ownerId);
    const userStrId = userId.toString();

    const isOwner = ownerStrId === userStrId;
    const isMember = workspace.members.some(
      (m) => m.userId && getStrId(m.userId) === userStrId
    );

    if (!isOwner && !isMember) {
      throw new ForbiddenError('You do not have access to this workspace analytics');
    }

    // 1. Fetch all boards in the workspace
    const boards = await boardRepository.listBoards(workspace._id);
    const boardIds = boards.map((b) => b._id);

    // 2. Fetch all lists for all boards
    const lists = [];
    for (const boardId of boardIds) {
      const boardLists = await listRepository.findListsByBoard(boardId);
      lists.push(...boardLists);
    }

    // 3. Identify completed list IDs (names matching Done or Completed, case-insensitive)
    const completedListIds = lists
      .filter((l) => /done|completed/i.test(l.name))
      .map((l) => l._id.toString());

    // 4. Fetch all tasks for the boards
    const tasks = [];
    for (const boardId of boardIds) {
      const boardTasks = await taskRepository.findTasksByBoard(boardId, { isDeleted: false });
      tasks.push(...boardTasks);
    }

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => completedListIds.includes(t.listId.toString()));
    const activeTasks = totalTasks - completedTasks.length;

    // Priority breakdown
    const priorityBreakdown = {
      low: tasks.filter((t) => t.priority === 'low').length,
      medium: tasks.filter((t) => t.priority === 'medium').length,
      high: tasks.filter((t) => t.priority === 'high').length,
      urgent: tasks.filter((t) => t.priority === 'urgent').length,
    };

    // Calculate weekly completion velocity (past 4 weeks)
    const now = new Date();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const velocity = [];

    for (let i = 3; i >= 0; i--) {
      const start = new Date(now.getTime() - (i + 1) * oneWeek);
      const end = new Date(now.getTime() - i * oneWeek);

      // Completed in this week (using updatedAt on done tasks)
      const count = completedTasks.filter((t) => {
        const time = new Date(t.updatedAt || t.createdAt).getTime();
        return time >= start.getTime() && time < end.getTime();
      }).length;

      velocity.push({
        weekStart: start.toISOString().split('T')[0],
        completedCount: count,
      });
    }

    // Calculate average cycle time (days between task creation and completion) from activityLogs
    let averageCycleTimeDays = 0;
    try {
      const completions = await ActivityLog.find({
        workspaceId: workspace._id,
        action: 'task:completed'
      }).lean();

      if (completions.length > 0) {
        let totalCycleTimeMs = 0;
        let countedCompletions = 0;

        for (const log of completions) {
          const createLog = await ActivityLog.findOne({
            workspaceId: workspace._id,
            entityId: log.entityId,
            action: 'task:create'
          }).lean();

          if (createLog) {
            totalCycleTimeMs += new Date(log.createdAt).getTime() - new Date(createLog.createdAt).getTime();
            countedCompletions++;
          }
        }

        if (countedCompletions > 0) {
          averageCycleTimeDays = parseFloat(
            (totalCycleTimeMs / (countedCompletions * 24 * 60 * 60 * 1000)).toFixed(2)
          );
        }
      }
    } catch (err) {
      logger.warn(`Failed to compute average cycle time: ${err.message}`);
    }

    return {
      workspaceId: workspace._id,
      totalBoards: boards.length,
      totalMembers: workspace.members.length,
      totalTasks,
      activeTasksCount: activeTasks,
      completedTasksCount: completedTasks.length,
      priorityBreakdown,
      averageCycleTimeDays
    };
  }

  /**
   * Search workspace members by name or email.
   * Only accessible by workspace members/owners.
   */
  async searchMembers(workspaceId, userId, { q = '', limit = 20, page = 1 } = {}) {
    const workspace = await workspaceRepository.findWorkspaceMembersOnly(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const ownerStrId = getStrId(workspace.ownerId);
    const userStrId = userId.toString();

    const isOwner = ownerStrId === userStrId;
    const isMember = workspace.members.some(
      (m) => m.userId && getStrId(m.userId) === userStrId
    );

    if (!isOwner && !isMember) {
      throw new ForbiddenError('You do not have access to this workspace');
    }

    const memberIds = workspace.members.map((m) => m.userId).filter(Boolean);
    if (!memberIds.some((id) => getStrId(id) === ownerStrId)) {
      memberIds.push(workspace.ownerId);
    }

    const userQuery = {
      _id: { $in: memberIds },
      isActive: true
    };

    const trimmedQ = (q || '').trim();
    if (trimmedQ) {
      const escapedQuery = trimmedQ.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(escapedQuery, 'i');
      userQuery.$or = [
        { fullName: regex },
        { email: regex }
      ];
    }

    const parsedPage = Number.parseInt(page, 10) || 1;
    const parsedLimit = Number.parseInt(limit, 10) || 20;
    const skip = (parsedPage - 1) * parsedLimit;

    const matchedUsers = await User.find(userQuery)
      .select('fullName email avatarUrl')
      .skip(skip)
      .limit(parsedLimit)
      .lean();

    return matchedUsers.map((user) => ({
      _id: user._id,
      name: user.fullName,
      email: user.email,
      avatar: user.avatarUrl || null
    }));
  }
}

export default new WorkspaceService();
