import { describe, test, expect, beforeAll, afterAll, beforeEach, mock } from 'bun:test';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/modules/auth/user.model.js';
import { Workspace } from '../src/modules/workspace/workspace.model.js';
import workspaceService from '../src/modules/workspace/workspace.service.js';
import workspaceController from '../src/modules/workspace/workspace.controller.js';
import { ForbiddenError, NotFoundError, BadRequestError } from '../src/utils/errors.js';

process.env.NODE_ENV = 'test';
dotenv.config();

describe('Workspace Management System Tests', () => {
  let userOwner;
  let userAdmin;
  let userViewer;
  let userExternal;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/taskflow_test';
    if (mongoose.connection.readyState === 0) {
      const conn = await mongoose.connect(mongoUri);
      try {
        await conn.connection.db.collection('workspaces').dropIndex('slug_1');
      } catch (err) {
        // Ignore if index doesn't exist
      }
    }
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Workspace.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Workspace.deleteMany({});

    // Create test users
    userOwner = await User.create({
      email: 'owner@example.com',
      password: 'HashedPassword1!',
      fullName: 'Workspace Owner'
    });

    userAdmin = await User.create({
      email: 'admin_member@example.com',
      password: 'HashedPassword1!',
      fullName: 'Admin Member'
    });

    userViewer = await User.create({
      email: 'viewer_member@example.com',
      password: 'HashedPassword1!',
      fullName: 'Viewer Member'
    });

    userExternal = await User.create({
      email: 'external@example.com',
      password: 'HashedPassword1!',
      fullName: 'External User'
    });
  });

  // ==========================================
  // Workspace Creation Tests
  // ==========================================
  describe('Create Workspace', () => {
    test('should create a workspace with a unique slug and add creator as admin member', async () => {
      const name = 'Engineering Team';
      const description = 'Workspace for engineering team tasks';
      const settings = {
        allowViewerComments: false,
      };

      const workspace = await workspaceService.createWorkspace(userOwner._id, {
        name,
        description,
        settings
      });

      expect(workspace).toBeDefined();
      expect(workspace.name).toBe(name);
      expect(workspace.slug).toBe('engineering-team');
      expect(workspace.description).toBe(description);
      expect(workspace.ownerId.toString()).toBe(userOwner._id.toString());
      expect(workspace.isDeleted).toBe(false);
      expect(workspace.deletedAt).toBeNull();
      expect(workspace.settings.allowViewerComments).toBe(false);

      // Creator must be in members array as 'admin'
      expect(workspace.members).toHaveLength(1);
      expect(workspace.members[0].userId.toString()).toBe(userOwner._id.toString());
      expect(workspace.members[0].role).toBe('admin');
    });

    test('should resolve slug collision by appending a unique hex suffix', async () => {
      // Create first workspace
      const ws1 = await workspaceService.createWorkspace(userOwner._id, { name: 'Devs' });
      expect(ws1.slug).toBe('devs');

      // Create second workspace with same name under a different user (triggers slug suffix)
      const ws2 = await workspaceService.createWorkspace(userAdmin._id, { name: 'Devs' });
      expect(ws2.slug).not.toBe('devs');
      expect(ws2.slug.startsWith('devs-')).toBe(true);
      expect(ws2.slug.length).toBe(11); // 'devs-' (5) + 6 hex chars = 11
    });

    test('should allow creating a workspace with the same name if the existing one is soft-deleted', async () => {
      // Create first workspace
      const ws1 = await workspaceService.createWorkspace(userOwner._id, { name: 'Engineering Team' });
      expect(ws1.slug).toBe('engineering-team');

      // Soft delete it
      await workspaceService.softDeleteWorkspace(ws1._id, userOwner._id);

      // Create second workspace with the same name under the same user
      const ws2 = await workspaceService.createWorkspace(userOwner._id, { name: 'Engineering Team' });
      expect(ws2.name).toBe('Engineering Team');
      expect(ws2.slug).toBe('engineering-team'); // Should reuse the slug since the old one is soft-deleted
    });

    test('should block creating a workspace with duplicate name under the same user', async () => {
      await workspaceService.createWorkspace(userOwner._id, { name: 'Duplicate Name' });

      let error;
      try {
        await workspaceService.createWorkspace(userOwner._id, { name: 'Duplicate Name' });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe('A workspace with this name already exists');
    });

    test('should allow different users to create workspaces with the same name', async () => {
      const ws1 = await workspaceService.createWorkspace(userOwner._id, { name: 'Shared Name' });
      const ws2 = await workspaceService.createWorkspace(userAdmin._id, { name: 'Shared Name' });

      expect(ws1.name).toBe('Shared Name');
      expect(ws2.name).toBe('Shared Name');
      expect(ws1.slug).toBe('shared-name');
      expect(ws2.slug).not.toBe('shared-name'); // Slugs are still globally unique among active workspaces
    });
  });

  // ==========================================
  // List Workspaces Tests
  // ==========================================
  describe('List Workspaces', () => {
    test('should list workspaces that the user owns or is a member of', async () => {
      // ws1 owned by userOwner
      const ws1 = await workspaceService.createWorkspace(userOwner._id, { name: 'Owner Workspace' });

      // ws2 owned by userAdmin
      const ws2 = await workspaceService.createWorkspace(userAdmin._id, { name: 'Admin Workspace' });

      // Owner lists their workspaces: should see ws1
      let ownerList = await workspaceService.listWorkspaces(userOwner._id);
      expect(ownerList).toHaveLength(1);
      expect(ownerList[0]._id.toString()).toBe(ws1._id.toString());

      // Add userOwner as a member to ws2
      ws2.members.push({ userId: userOwner._id, role: 'viewer', joinedAt: new Date() });
      await ws2.save();

      // Owner lists again: should now see both ws1 and ws2
      ownerList = await workspaceService.listWorkspaces(userOwner._id);
      expect(ownerList).toHaveLength(2);

      // External user lists workspaces: should see none
      const externalList = await workspaceService.listWorkspaces(userExternal._id);
      expect(externalList).toHaveLength(0);
    });

    test('should exclude soft-deleted workspaces from listing', async () => {
      const ws = await workspaceService.createWorkspace(userOwner._id, { name: 'Deleted Workspace' });
      
      let list = await workspaceService.listWorkspaces(userOwner._id);
      expect(list).toHaveLength(1);

      // Soft delete
      await workspaceService.softDeleteWorkspace(ws._id, userOwner._id);

      list = await workspaceService.listWorkspaces(userOwner._id);
      expect(list).toHaveLength(0);
    });
  });

  // ==========================================
  // Get Workspace Details Tests
  // ==========================================
  describe('Get Workspace Details', () => {
    test('should allow owner or member to retrieve details', async () => {
      const ws = await workspaceService.createWorkspace(userOwner._id, { name: 'Project Workspace' });
      ws.members.push({ userId: userViewer._id, role: 'viewer', joinedAt: new Date() });
      await ws.save();

      // Owner can retrieve
      const detailsOwner = await workspaceService.getWorkspaceDetails(ws._id, userOwner._id);
      expect(detailsOwner.name).toBe('Project Workspace');
      expect(detailsOwner.ownerId.email).toBe('owner@example.com');

      // Viewer member can retrieve
      const detailsViewer = await workspaceService.getWorkspaceDetails(ws._id, userViewer._id);
      expect(detailsViewer.name).toBe('Project Workspace');

      // External user forbidden
      let error;
      try {
        await workspaceService.getWorkspaceDetails(ws._id, userExternal._id);
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenError);
    });

    test('should throw NotFoundError if workspace is soft-deleted or non-existent', async () => {
      const ws = await workspaceService.createWorkspace(userOwner._id, { name: 'Temp' });
      await workspaceService.softDeleteWorkspace(ws._id, userOwner._id);

      let error;
      try {
        await workspaceService.getWorkspaceDetails(ws._id, userOwner._id);
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(NotFoundError);

      // Test invalid ObjectId format
      let formatError;
      try {
        await workspaceService.getWorkspaceDetails('invalid_id', userOwner._id);
      } catch (err) {
        formatError = err;
      }
      expect(formatError).toBeDefined();
      expect(formatError).toBeInstanceOf(NotFoundError);
    });
  });

  // ==========================================
  // Update Workspace Tests
  // ==========================================
  describe('Update Workspace', () => {
    test('should allow owner or admin member to update workspace fields', async () => {
      const ws = await workspaceService.createWorkspace(userOwner._id, {
        name: 'Initial Name',
        description: 'Old description'
      });
      ws.members.push({ userId: userAdmin._id, role: 'admin', joinedAt: new Date() });
      ws.members.push({ userId: userViewer._id, role: 'viewer', joinedAt: new Date() });
      await ws.save();

      // Admin member updates name and settings
      const updated = await workspaceService.updateWorkspace(ws._id, userAdmin._id, {
        name: 'Updated by Admin',
        settings: { allowViewerComments: false }
      });
      expect(updated.name).toBe('Updated by Admin');
      expect(updated.settings.allowViewerComments).toBe(false);

      // Owner updates description
      const updated2 = await workspaceService.updateWorkspace(ws._id, userOwner._id, {
        description: 'New owner description'
      });
      expect(updated2.description).toBe('New owner description');

      // Viewer member attempts update -> Forbidden
      let error;
      try {
        await workspaceService.updateWorkspace(ws._id, userViewer._id, { name: 'Viewer Hack' });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenError);
    });
  });

  // ==========================================
  // Soft Delete Workspace Tests
  // ==========================================
  describe('Soft Delete Workspace', () => {
    test('should allow only owner to soft delete a workspace', async () => {
      const ws = await workspaceService.createWorkspace(userOwner._id, { name: 'Main Workspace' });
      ws.members.push({ userId: userAdmin._id, role: 'admin', joinedAt: new Date() });
      await ws.save();

      // Admin member tries to delete -> Forbidden
      let error;
      try {
        await workspaceService.softDeleteWorkspace(ws._id, userAdmin._id);
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenError);

      // Owner soft deletes -> Success
      const result = await workspaceService.softDeleteWorkspace(ws._id, userOwner._id);
      expect(result.message).toBe('Workspace deleted successfully');

      // Verify in DB
      const dbWs = await Workspace.findById(ws._id);
      expect(dbWs.isDeleted).toBe(true);
      expect(dbWs.deletedAt).toBeInstanceOf(Date);
    });
  });

  // ==========================================
  // Controller Tests
  // ==========================================
  describe('Workspace Controller Integration', () => {
    test('should map create request parameters and call success handler', async () => {
      const req = {
        user: { _id: userOwner._id },
        body: { name: 'Controller Workspace', description: 'Tested via controller' }
      };

      const res = {
        status: mock(function() { return this; }),
        json: mock(function() { return this; })
      };

      await workspaceController.createWorkspace(req, res);

      // Wait a moment for asyncHandler
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    test('should list workspaces with default pagination and full view', async () => {
      const ws1 = await workspaceService.createWorkspace(userOwner._id, { name: 'WS One', description: 'One' });
      const ws2 = await workspaceService.createWorkspace(userOwner._id, { name: 'WS Two', description: 'Two' });

      const req = {
        user: { _id: userOwner._id },
        query: { page: '1', limit: '10', view: 'full' }
      };

      let responseData;
      const res = {
        status: mock(function() { return this; }),
        json: mock(function(data) { responseData = data; return this; })
      };
      let nextError;
      const next = mock(err => { nextError = err; });

      await workspaceController.listWorkspaces(req, res, next);
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(res.status).toHaveBeenCalledWith(200);
      expect(responseData).toBeDefined();
      expect(responseData.status).toBe('success');
      expect(responseData.data.workspaces).toHaveLength(2);
      expect(responseData.data.pagination.totalItems).toBe(2);
      expect(responseData.data.pagination.totalPages).toBe(1);
      expect(responseData.data.pagination.currentPage).toBe(1);
      expect(responseData.data.pagination.limit).toBe(10);
      
      // Full view has descriptive fields
      expect(responseData.data.workspaces[0].description).toBe('Two');
      expect(responseData.data.workspaces[0].ownerId).toBeDefined();
    });

    test('should list workspaces in compact view with only _id, slug, and name', async () => {
      await workspaceService.createWorkspace(userOwner._id, { name: 'Compact Test', description: 'Confidential' });

      const req = {
        user: { _id: userOwner._id },
        query: { page: '1', limit: '10', view: 'compact' }
      };

      let responseData;
      const res = {
        status: mock(function() { return this; }),
        json: mock(function(data) { responseData = data; return this; })
      };
      let nextError;
      const next = mock(err => { nextError = err; });

      await workspaceController.listWorkspaces(req, res, next);
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(res.status).toHaveBeenCalledWith(200);
      expect(responseData.data.workspaces).toHaveLength(1);
      
      const ws = responseData.data.workspaces[0];
      expect(ws._id).toBeDefined();
      expect(ws.slug).toBeDefined();
      expect(ws.name).toBeDefined();
      
      // Excluded fields should not be present in compact view
      expect(ws.description).toBeUndefined();
      expect(ws.ownerId).toBeUndefined();
      expect(ws.members).toBeUndefined();
    });

    test('should reject invalid page numbers', async () => {
      const req = {
        user: { _id: userOwner._id },
        query: { page: '-5', limit: '10' }
      };

      const res = {
        status: mock(function() { return this; }),
        json: mock(function() { return this; })
      };

      let nextError;
      const next = mock(err => { nextError = err; });

      await workspaceController.listWorkspaces(req, res, next);
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(nextError).toBeDefined();
      expect(nextError.message).toBe('Page number must be a positive integer');
    });

    test('should reject invalid limit parameter', async () => {
      const req = {
        user: { _id: userOwner._id },
        query: { page: '1', limit: '200' }
      };

      const res = {
        status: mock(function() { return this; }),
        json: mock(function() { return this; })
      };

      let nextError;
      const next = mock(err => { nextError = err; });

      await workspaceController.listWorkspaces(req, res, next);
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(nextError).toBeDefined();
      expect(nextError.message).toBe('Limit must be a positive integer between 1 and 100');
    });

    test('should reject invalid view parameters', async () => {
      const req = {
        user: { _id: userOwner._id },
        query: { page: '1', limit: '10', view: 'invalid_mode' }
      };

      const res = {
        status: mock(function() { return this; }),
        json: mock(function() { return this; })
      };

      let nextError;
      const next = mock(err => { nextError = err; });

      await workspaceController.listWorkspaces(req, res, next);
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(nextError).toBeDefined();
      expect(nextError.message).toBe("View parameter must be either 'compact' or 'full'");
    });

    test('should search workspace members via controller endpoint', async () => {
      const ws = await workspaceService.createWorkspace(userOwner._id, { name: 'Search Controller WS' });
      
      const req = {
        user: { _id: userOwner._id },
        params: { workspaceId: ws._id.toString() },
        query: { q: 'Owner', limit: '10', page: '1' }
      };

      let responseData;
      const res = {
        status: mock(function() { return this; }),
        json: mock(function(data) { responseData = data; return this; })
      };
      
      let nextError;
      const next = mock(err => { nextError = err; });

      await workspaceController.searchMembers(req, res, next);
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(res.status).toHaveBeenCalledWith(200);
      expect(responseData).toBeDefined();
      expect(responseData.status).toBe('success');
      expect(responseData.data).toBeDefined();
      expect(responseData.data).toHaveLength(1);
      expect(responseData.data[0].name).toBe('Workspace Owner');
    });
  });

  // ==========================================
  // Workspace Members & Invites Tests
  // ==========================================
  describe('Workspace Members & Invites Service', () => {
    let ws;

    beforeEach(async () => {
      // Create a base workspace for each test
      ws = await workspaceService.createWorkspace(userOwner._id, {
        name: 'Workspace Members Test'
      });
    });

    test('should allow owner/member to list members, and forbid external user', async () => {
      // Add userAdmin as member
      ws.members.push({ userId: userAdmin._id, role: 'member', joinedAt: new Date() });
      await ws.save();

      const members = await workspaceService.listMembers(ws._id, userOwner._id);
      expect(members).toHaveLength(2);

      const membersAdmin = await workspaceService.listMembers(ws._id, userAdmin._id);
      expect(membersAdmin).toHaveLength(2);

      // External user forbidden
      let error;
      try {
        await workspaceService.listMembers(ws._id, userExternal._id);
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenError);
    });

    test('should allow owner/admin to invite a member and enforce dynamic/overridden expiry', async () => {
      // Invite with default expiry (read from workspace settings which is default 7 days)
      const invite = await workspaceService.inviteMember(ws._id, userOwner._id, {
        email: 'new_member@example.com',
        role: 'viewer'
      });

      expect(invite).toBeDefined();
      expect(invite.email).toBe('new_member@example.com');
      expect(invite.role).toBe('viewer');
      expect(invite.status).toBe('pending');
      expect(invite.token).toBeDefined();
      expect(invite.isDeleted).toBe(false);
      
      const expectedExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
      expect(invite.expiresAt.getTime()).toBeCloseTo(expectedExpiry, -3); // close within 500ms

      // Invite with dynamic override expiry (e.g. 2 days)
      const inviteCustom = await workspaceService.inviteMember(ws._id, userOwner._id, {
        email: 'custom_expiry@example.com',
        role: 'member',
        inviteExpiryDays: 2
      });
      const expectedCustomExpiry = Date.now() + 2 * 24 * 60 * 60 * 1000;
      expect(inviteCustom.expiresAt.getTime()).toBeCloseTo(expectedCustomExpiry, -3); // close within 500ms
    });

    test('should soft-delete old pending invite when a new one is sent to the same email', async () => {
      const email = 'duplicate_invite@example.com';
      
      // 1st invite
      const invite1 = await workspaceService.inviteMember(ws._id, userOwner._id, { email });
      expect(invite1.isDeleted).toBe(false);

      // 2nd invite
      const invite2 = await workspaceService.inviteMember(ws._id, userOwner._id, { email });
      expect(invite2.isDeleted).toBe(false);

      // Check invite1 in database is soft deleted
      const updatedInvite1 = await mongoose.model('WorkspaceInvites').findById(invite1._id);
      expect(updatedInvite1.isDeleted).toBe(true);
      expect(updatedInvite1.deletedAt).toBeInstanceOf(Date);
    });

    test('should reject invite if user is already a member', async () => {
      let error;
      try {
        await workspaceService.inviteMember(ws._id, userOwner._id, {
          email: 'owner@example.com' // Already a member (owner)
        });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe('User is already a member of this workspace');
    });

    test('should allow owner/admin to list pending invites, and exclude soft-deleted/expired invites', async () => {
      const invite = await workspaceService.inviteMember(ws._id, userOwner._id, { email: 'pending1@example.com' });
      const invite2 = await workspaceService.inviteMember(ws._id, userOwner._id, { email: 'pending2@example.com' });

      let list = await workspaceService.listPendingInvites(ws._id, userOwner._id);
      expect(list).toHaveLength(2);

      // Soft-delete one
      await workspaceService.revokeInvite(ws._id, invite._id, userOwner._id);

      list = await workspaceService.listPendingInvites(ws._id, userOwner._id);
      expect(list).toHaveLength(1);
      expect(list[0]._id.toString()).toBe(invite2._id.toString());
    });

    test('should allow invited user to accept invite and verify security email constraint', async () => {
      const invite = await workspaceService.inviteMember(ws._id, userOwner._id, {
        email: 'admin_member@example.com',
        role: 'member'
      });

      // Accept with wrong user (email doesn't match)
      let error;
      try {
        await workspaceService.acceptInvite(invite.token, userExternal); // external email: external@example.com
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenError);

      // Accept with correct user
      const result = await workspaceService.acceptInvite(invite.token, userAdmin); // admin email: admin_member@example.com
      expect(result.message).toBe('Invitation accepted successfully');
      expect(result.role).toBe('member');

      // Member should be in the workspace
      const updatedWs = await workspaceService.getWorkspaceDetails(ws._id, userOwner._id);
      expect(updatedWs.members).toHaveLength(2);
      expect(updatedWs.members[1].userId.email).toBe('admin_member@example.com');
      expect(updatedWs.members[1].role).toBe('member');

      // Invite status in database is now accepted
      const updatedInvite = await mongoose.model('WorkspaceInvites').findById(invite._id);
      expect(updatedInvite.status).toBe('accepted');

      // Re-accepting already accepted invite returns alreadyMember: true
      const reAcceptResult = await workspaceService.acceptInvite(invite.token, userAdmin);
      expect(reAcceptResult.alreadyMember).toBe(true);
    });

    test('should allow retrieving invite details via getInviteDetails', async () => {
      const invite = await workspaceService.inviteMember(ws._id, userOwner._id, {
        email: 'viewer_member@example.com',
        role: 'viewer'
      });

      const details = await workspaceService.getInviteDetails(invite.token);
      expect(details).toBeDefined();
      expect(details.valid).toBe(true);
      expect(details.status).toBe('pending');
      expect(details.email).toBe('viewer_member@example.com');
      expect(details.role).toBe('viewer');
      expect(details.workspace.name).toBe(ws.name);
      expect(details.invitedBy.email).toBe(userOwner.email);
      expect(details.userExists).toBe(true); // viewer_member@example.com exists in users
    });

    test('should allow invited user to decline invite', async () => {
      const invite = await workspaceService.inviteMember(ws._id, userOwner._id, {
        email: 'viewer_member@example.com',
        role: 'viewer'
      });

      // Decline with wrong user
      let error;
      try {
        await workspaceService.declineInvite(invite.token, userExternal);
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenError);

      // Decline with correct user
      const result = await workspaceService.declineInvite(invite.token, userViewer);
      expect(result.message).toBe('Invitation declined successfully');

      const updatedInvite = await mongoose.model('WorkspaceInvites').findById(invite._id);
      expect(updatedInvite.status).toBe('declined');
      expect(updatedInvite.isDeleted).toBe(true);
    });

    test('should allow admin/owner to change role of a member, and forbid changing owner role', async () => {
      ws.members.push({ userId: userAdmin._id, role: 'viewer', joinedAt: new Date() });
      ws.members.push({ userId: userViewer._id, role: 'member', joinedAt: new Date() });
      await ws.save();

      // Owner changes userViewer role to admin
      const members = await workspaceService.changeMemberRole(ws._id, userOwner._id, userViewer._id, 'admin');
      const targetMember = members.find(m => {
        const idStr = m.userId && (m.userId._id ? m.userId._id.toString() : m.userId.toString());
        return idStr === userViewer._id.toString();
      });
      expect(targetMember).toBeDefined();
      expect(targetMember.role).toBe('admin');

      // Regular member (viewer) attempts to change role -> ForbiddenError
      let fbError;
      try {
        await workspaceService.changeMemberRole(ws._id, userAdmin._id, userViewer._id, 'member');
      } catch (err) {
        fbError = err;
      }
      expect(fbError).toBeDefined();
      expect(fbError).toBeInstanceOf(ForbiddenError);

      // Attempt to change owner's role -> BadRequestError
      let error;
      try {
        await workspaceService.changeMemberRole(ws._id, userOwner._id, userOwner._id, 'viewer');
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe('Cannot change your own role');
    });

    test('should allow admin/owner to remove member, and forbid removing owner', async () => {
      ws.members.push({ userId: userAdmin._id, role: 'member', joinedAt: new Date() });
      ws.members.push({ userId: userViewer._id, role: 'viewer', joinedAt: new Date() });
      await ws.save();

      // Regular member (viewer) attempts to remove member -> ForbiddenError
      let fbError;
      try {
        await workspaceService.removeMember(ws._id, userViewer._id, userAdmin._id);
      } catch (err) {
        fbError = err;
      }
      expect(fbError).toBeDefined();
      expect(fbError).toBeInstanceOf(ForbiddenError);

      // Remove member by owner
      const result = await workspaceService.removeMember(ws._id, userOwner._id, userAdmin._id);
      expect(result.message).toBe('Member removed successfully');

      const updatedWs = await workspaceService.getWorkspaceDetails(ws._id, userOwner._id);
      expect(updatedWs.members).toHaveLength(2); // Owner and viewer

      // Attempt to remove owner -> BadRequestError
      let error;
      try {
        await workspaceService.removeMember(ws._id, userOwner._id, userOwner._id);
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(BadRequestError);
    });

    test('should allow member to leave workspace, and forbid owner from leaving', async () => {
      ws.members.push({ userId: userAdmin._id, role: 'member', joinedAt: new Date() });
      await ws.save();

      // Member leaves
      const result = await workspaceService.leaveWorkspace(ws._id, userAdmin._id);
      expect(result.message).toBe('You have left the workspace successfully');

      const updatedWs = await workspaceService.getWorkspaceDetails(ws._id, userOwner._id);
      expect(updatedWs.members).toHaveLength(1);

      // Owner tries to leave -> BadRequestError
      let error;
      try {
        await workspaceService.leaveWorkspace(ws._id, userOwner._id);
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe('Workspace owner cannot leave the workspace');
    });

    test('should search workspace members and return lite matches by name or email', async () => {
      // Add members
      ws.members.push({ userId: userAdmin._id, role: 'admin', joinedAt: new Date() });
      ws.members.push({ userId: userViewer._id, role: 'viewer', joinedAt: new Date() });
      await ws.save();

      // Update one of the users to have an avatarUrl
      userAdmin.avatarUrl = 'https://example.com/avatar.png';
      await userAdmin.save();

      // Search by name
      let results = await workspaceService.searchMembers(ws._id, userOwner._id, { q: 'Admin' });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Admin Member');
      expect(results[0].email).toBe('admin_member@example.com');
      expect(results[0].avatar).toBe('https://example.com/avatar.png');

      // Search by email
      results = await workspaceService.searchMembers(ws._id, userOwner._id, { q: 'viewer_member@example.com' });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Viewer Member');
      expect(results[0].avatar).toBeNull();

      // Search with empty query returns all members (owner + admin + viewer = 3)
      results = await workspaceService.searchMembers(ws._id, userOwner._id, { q: '' });
      expect(results).toHaveLength(3);

      // Search with query that matches nothing returns empty array
      results = await workspaceService.searchMembers(ws._id, userOwner._id, { q: 'nonexistent' });
      expect(results).toHaveLength(0);

      // Escape special characters test
      results = await workspaceService.searchMembers(ws._id, userOwner._id, { q: 'Admin+Member' });
      expect(results).toHaveLength(0);
    });

    test('should enforce workspace access control during search', async () => {
      let error;
      try {
        await workspaceService.searchMembers(ws._id, userExternal._id, { q: 'Owner' });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenError);
    });
  });
});
