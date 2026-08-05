import mongoose from 'mongoose';
import workspaceRepository from './workspace.repository.js';
import User from '../auth/user.model.js';
import { generateUniqueSlug, getStrId, generateRandomToken } from './workspace.utils.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';
import { enqueueEmail } from '../email/email.queue.js';

class WorkspaceService {
  /**
   * Create a new workspace.
   * Creator user is assigned as the owner, and also added to the members list with the 'admin' role.
   */
  async createWorkspace(userId, { name, description, settings }) {
    const existingByName = await workspaceRepository.findWorkspaceByName(name);
    if (existingByName) {
      throw new BadRequestError('A workspace with this name already exists');
    }
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
      const existingByName = await workspaceRepository.findWorkspaceByName(trimmedName);
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

    const updatedWorkspace = await workspaceRepository.updateWorkspace(workspace._id, allowedUpdates);
    logger.info(`Workspace updated`, { workspaceId: workspace._id, updatedBy: userId, updatedFields: Object.keys(allowedUpdates) });
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
   * Accept an invitation using its secure token.
   * Invited user must be logged in/authenticated.
   */
  async acceptInvite(token, authenticatedUser) {
    if (!token) {
      throw new BadRequestError('Invitation token is required');
    }

    const invite = await workspaceRepository.findInviteByToken(token);
    if (!invite) {
      throw new NotFoundError('Invitation is invalid, expired, or has been revoked');
    }

    // Security check: email must match
    if (authenticatedUser.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new ForbiddenError('This invitation was sent to a different email address');
    }

    const workspace = await workspaceRepository.findWorkspaceById(invite.workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const userStrId = authenticatedUser._id.toString();

    // Check if they are already a member
    const isMember = workspace.members.some(
      (m) => m.userId && getStrId(m.userId) === userStrId
    );
    if (isMember) {
      // Mark invite as accepted/expired to clean up
      invite.status = 'accepted';
      await invite.save();
      throw new BadRequestError('You are already a member of this workspace');
    }

    // Add member
    workspace.members.push({
      userId: authenticatedUser._id,
      role: invite.role,
      joinedAt: new Date()
    });

    await workspace.save();

    // Mark invite as accepted
    invite.status = 'accepted';
    await invite.save();

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
}

export default new WorkspaceService();
