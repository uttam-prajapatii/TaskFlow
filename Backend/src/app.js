import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import requestLogger from './middlewares/requestLogger.js';
import errorHandler from './middlewares/errorHandler.js';
import { NotFoundError } from './utils/errors.js';
import apiRouter from './routes/index.js';

const app = express();

// Trust proxy for rate limiting behind reverse proxies (like Nginx/Docker)
app.set('trust proxy', 1);

// Enable request logging (Morgan + Winston)
app.use(requestLogger);

// Enable CORS, cookie parsing, and JSON parsing middlewares
app.use(cors());
app.use(cookieParser());
app.use(express.json());

// Minimal check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'TaskFlow API is running...' });
});

// Mount main API routes
app.use('/api/v1', apiRouter);

// Fallback for unhandled routes
app.all('*', (req, res, next) => {
  next(new NotFoundError(`Can't find ${req.originalUrl} on this server`));
});

// Global Centralized Error Handler Middleware
app.use(errorHandler);

export default app;
