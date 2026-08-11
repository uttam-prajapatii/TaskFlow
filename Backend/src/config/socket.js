import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import IORedis from 'ioredis';
import tokenService from '../modules/auth/token.service.js';
import authRepository from '../modules/auth/auth.repository.js';
import logger from '../utils/logger.js';

let io;

/**
 * Initializes the Socket.io server with a Redis Pub/Sub adapter.
 * Handles user authentication via cookie/Authorization headers and tracks presence.
 */
export function initSocket(server) {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const pubClient = new IORedis(redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: false });
  const subClient = pubClient.duplicate();

  io = new Server(server, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : 'http://localhost:5173',
      credentials: true,
    },
  });

  io.adapter(createAdapter(pubClient, subClient));

  // Middleware to authenticate WebSocket connection
  io.use(async (socket, next) => {
    try {
      let token;

      // Extract from Cookie header
      const cookieHeader = socket.handshake.headers.cookie;
      if (cookieHeader) {
        const cookies = Object.fromEntries(
          cookieHeader.split(';').map((cookie) => {
            const [key, ...val] = cookie.trim().split('=');
            return [key, decodeURIComponent(val.join('='))];
          })
        );
        token = cookies[process.env.JWT_ACCESS_COOKIE_NAME || 'accessToken'];
      }

      // Fallback to Authorization Header
      if (!token) {
        const authHeader = socket.handshake.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.split(' ')[1];
        }
      }

      if (!token) {
        return next(new Error('Authentication error: Access token missing'));
      }

      // Verify the Access Token
      const decoded = tokenService.verifyToken(token, process.env.JWT_ACCESS_SECRET);
      
      // Ensure user exists and is active
      const user = await authRepository.findUserById(decoded.sub);
      if (!user || !user.isActive) {
        return next(new Error('Authentication error: User inactive or not found'));
      }

      // Attach user details to socket object
      socket.user = {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      };

      next();
    } catch (err) {
      logger.error('WebSocket connection authentication failed', { error: err.message });
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`WebSocket client connected: ${socket.user.name} (id=${socket.id})`);

    // Join private room for user-specific pushes
    socket.join(`user:${socket.user._id}`);

    // Listen for client joining a board
    socket.on('board:join', async (boardId) => {
      socket.join(`board:${boardId}`);
      logger.info(`User ${socket.user.name} joined board room: board:${boardId}`);

      const presenceKey = `presence:board:${boardId}`;
      const userPresence = JSON.stringify({
        userId: socket.user._id,
        name: socket.user.name,
        avatarUrl: socket.user.avatarUrl,
      });

      // Add user to the Redis presence set
      await pubClient.sadd(presenceKey, userPresence);
      await pubClient.expire(presenceKey, 3600); // 1-hour heartbeat fallback TTL

      // Emit updated board presence
      const members = await getBoardPresence(boardId, pubClient);
      io.to(`board:${boardId}`).emit('board:presence', { boardId, members });
    });

    // Listen for client leaving a board
    socket.on('board:leave', async (boardId) => {
      socket.leave(`board:${boardId}`);
      logger.info(`User ${socket.user.name} left board room: board:${boardId}`);

      const presenceKey = `presence:board:${boardId}`;
      const userPresence = JSON.stringify({
        userId: socket.user._id,
        name: socket.user.name,
        avatarUrl: socket.user.avatarUrl,
      });

      await pubClient.srem(presenceKey, userPresence);

      const members = await getBoardPresence(boardId, pubClient);
      io.to(`board:${boardId}`).emit('board:presence', { boardId, members });
    });

    // Handle WebSocket disconnection
    socket.on('disconnecting', async () => {
      logger.info(`WebSocket client disconnecting: ${socket.user.name} (id=${socket.id})`);

      // Clean up presence across all rooms the socket was part of
      const rooms = Array.from(socket.rooms);
      for (const room of rooms) {
        if (room.startsWith('board:')) {
          const boardId = room.split(':')[1];
          const presenceKey = `presence:board:${boardId}`;
          const userPresence = JSON.stringify({
            userId: socket.user._id,
            name: socket.user.name,
            avatarUrl: socket.user.avatarUrl,
          });
          await pubClient.srem(presenceKey, userPresence);
          const members = await getBoardPresence(boardId, pubClient);
          io.to(`board:${boardId}`).emit('board:presence', { boardId, members });
        }
      }
    });

    socket.on('disconnect', () => {
      logger.info(`WebSocket client disconnected: ${socket.user.id || socket.id}`);
    });
  });

  return io;
}

/**
 * Helper to fetch all users currently active on a board from Redis.
 */
async function getBoardPresence(boardId, redisClient) {
  try {
    const presenceKey = `presence:board:${boardId}`;
    const membersRaw = await redisClient.smembers(presenceKey);
    return membersRaw.map((m) => JSON.parse(m));
  } catch (err) {
    logger.error(`Failed to retrieve board presence for ${boardId}`, err);
    return [];
  }
}

/**
 * Accessor for the active Socket.io server instance.
 */
export function getIO() {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }
  return io;
}

/**
 * Helper to emit events to all clients inside a board room.
 */
export function emitToBoard(boardId, event, data) {
  if (io) {
    io.to(`board:${boardId}`).emit(event, data);
  }
}

/**
 * Helper to emit events to all clients inside a workspace room.
 */
export function emitToWorkspace(workspaceId, event, data) {
  if (io) {
    io.to(`workspace:${workspaceId}`).emit(event, data);
  }
}

/**
 * Helper to push private notifications to a specific user's room.
 */
export function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}
