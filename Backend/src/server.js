import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';
import logger from './utils/logger.js';
import { initSocket } from './config/socket.js';

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

// Handle uncaught exceptions globally
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...', { stack: err.stack });
  process.exit(1);
});

// Handle unhandled promise rejections globally
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! Shutting down...', { 
    stack: err instanceof Error ? err.stack : err 
  });
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Initialize Socket.io real-time engine
initSocket(server);

