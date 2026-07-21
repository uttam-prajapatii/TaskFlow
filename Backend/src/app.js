import express from 'express';
import cors from 'cors';
import requestLogger from './middlewares/requestLogger.js';
import errorHandler from './middlewares/errorHandler.js';
import { NotFoundError } from './utils/errors.js';
import logger from './utils/logger.js';

const app = express();

// Enable request logging (Morgan + Winston)
app.use(requestLogger);

// Enable CORS and JSON parsing middlewares
app.use(cors());
app.use(express.json());

// Minimal check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'TaskFlow API is running...' });
});

// Fallback for unhandled routes
app.all('*', (req, res, next) => {
  next(new NotFoundError(`Can't find ${req.originalUrl} on this server`));
});

// Global Centralized Error Handler Middleware
app.use(errorHandler);

export default app;
