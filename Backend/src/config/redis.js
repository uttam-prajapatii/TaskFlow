import IORedis from 'ioredis';
import logger from '../utils/logger.js';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Shared config options for Redis connections
export const redisConfig = {
  maxRetriesPerRequest: null, // Required to be null for BullMQ compatibility
  enableReadyCheck: false,
};

// Create and export a single shared Redis client instance for caching/OTP storage
const redisClient = new IORedis(redisUrl, redisConfig);

redisClient.on('error', (error) => {
  logger.error(`Redis connection error: ${error.message}`, {
    stack: error.stack,
  });
});

redisClient.on('connect', () => {
  logger.info(`Redis client connection established successfully at ${redisUrl.replace(/:[^@]+@/, ':****@')}`);
});

export default redisClient;
export { redisUrl };
