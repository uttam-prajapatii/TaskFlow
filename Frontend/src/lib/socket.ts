import { io, Socket } from 'socket.io-client';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

let socket: Socket | null = null;

/**
 * Returns the singleton Socket.io client instance.
 * Transports cookies/credentials for automatic access token authentication.
 */
export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(baseURL, {
      withCredentials: true,
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      // User room user:${userId} is automatically joined on backend authentication
    });

    socket.on('connect_error', (error) => {
      console.warn('[Socket] Connection error:', error.message);
    });
  }

  if (socket.disconnected) {
    socket.connect();
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
