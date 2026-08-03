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
      await mongoose.connect(mongoUri);
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
        defaultBoardVisibility: 'private'
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
      expect(workspace.settings.defaultBoardVisibility).toBe('private');

      // Creator must be in members array as 'admin'
      expect(workspace.members).toHaveLength(1);
      expect(workspace.members[0].userId.toString()).toBe(userOwner._id.toString());
      expect(workspace.members[0].role).toBe('admin');
    });

    test('should resolve slug collision by appending a unique hex suffix', async () => {
      // Create first workspace
      const ws1 = await workspaceService.createWorkspace(userOwner._id, { name: 'Devs' });
      expect(ws1.slug).toBe('devs');

      // Create second workspace with same name
      const ws2 = await workspaceService.createWorkspace(userAdmin._id, { name: 'Devs' });
      expect(ws2.slug).not.toBe('devs');
      expect(ws2.slug.startsWith('devs-')).toBe(true);
      expect(ws2.slug.length).toBe(11); // 'devs-' (5) + 6 hex chars = 11
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
      expect(formatError).toBeInstanceOf(BadRequestError);
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
      await new Promise(resolve => setTimeout(resolve, 50));

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
      await new Promise(resolve => setTimeout(resolve, 50));

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
      await new Promise(resolve => setTimeout(resolve, 50));

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
      await new Promise(resolve => setTimeout(resolve, 50));

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
      await new Promise(resolve => setTimeout(resolve, 50));

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
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(nextError).toBeDefined();
      expect(nextError.message).toBe("View parameter must be either 'compact' or 'full'");
    });
  });
});
