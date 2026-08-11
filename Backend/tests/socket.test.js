import { describe, test, expect, mock, beforeAll, afterAll } from 'bun:test';
import { initSocket, getIO, emitToBoard, emitToWorkspace, emitToUser } from '../src/config/socket.js';
import http from 'http';

describe('Socket.io Helper System Tests', () => {
  let server;

  beforeAll(() => {
    server = http.createServer();
    initSocket(server);
  });

  afterAll(() => {
    server.close();
  });

  test('should successfully return the active socket.io instance', () => {
    const io = getIO();
    expect(io).toBeDefined();
  });

  test('should not crash when emitting events to board rooms', () => {
    expect(() => {
      emitToBoard('test_board_id', 'task:updated', { test: true });
    }).not.toThrow();
  });

  test('should not crash when emitting events to workspace rooms', () => {
    expect(() => {
      emitToWorkspace('test_workspace_id', 'workspace:updated', { test: true });
    }).not.toThrow();
  });

  test('should not crash when emitting events to individual user rooms', () => {
    expect(() => {
      emitToUser('test_user_id', 'notification:push', { test: true });
    }).not.toThrow();
  });
});
