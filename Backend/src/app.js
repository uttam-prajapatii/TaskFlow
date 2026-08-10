import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import requestLogger from './middlewares/requestLogger.js';
import errorHandler from './middlewares/errorHandler.js';
import corsOptions from './config/corsOption.js';
import { NotFoundError } from './utils/errors.js';
import apiRouter from './routes/index.js';
import helmet from 'helmet';

// Load environment variables
dotenv.config();

const app = express();
app.use(helmet());


// Trust proxy for rate limiting behind reverse proxies (like Nginx/Docker)
app.set('trust proxy', 1);

// Enable request logging (Morgan + Winston)
app.use(requestLogger);

// Enable CORS, cookie parsing, and JSON parsing middlewares
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

import mongoose from 'mongoose';
import redisClient from './config/redis.js';

// Minimal check endpoints
app.get('/healthz', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

app.get('/readyz', (req, res) => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  const isRedisConnected = redisClient.status === 'ready';

  if (isMongoConnected && isRedisConnected) {
    res.status(200).json({
      status: 'READY',
      database: 'connected',
      cache: 'connected'
    });
  } else {
    res.status(503).json({
      status: 'NOT_READY',
      database: isMongoConnected ? 'connected' : 'disconnected',
      cache: isRedisConnected ? 'connected' : 'disconnected'
    });
  }
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
