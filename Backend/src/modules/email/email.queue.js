import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import logger from '../../utils/logger.js';
import { redisUrl, redisConfig } from '../../config/redis.js';

// Log the Redis host (obfuscating credentials)
try {
  const parsedUrl = new URL(redisUrl);
  logger.info(`emailQueue connecting to Redis host: ${parsedUrl.host} (protocol: ${parsedUrl.protocol})`);
} catch (e) {
  logger.warn(`emailQueue could not parse REDIS_URL for logging: ${e.message}`);
}

// Configure persistent redis connection for the queue
// BullMQ requires maxRetriesPerRequest to be null
const queueConnection = new IORedis(redisUrl, redisConfig);

queueConnection.on('error', (error) => {
  logger.error(`Redis connection error on emailQueue: ${error.message}`, {
    stack: error.stack,
  });
});

queueConnection.on('connect', async () => {
  logger.info(`emailQueue Redis connection established: ${redisUrl.replace(/:[^@]+@/, ':****@')}`);
  try {
    const whoami = await queueConnection.call('ACL', 'WHOAMI');
    logger.info(`emailQueue authenticated Redis user: ${whoami}`);
  } catch (err) {
    logger.warn(`emailQueue could not run ACL WHOAMI: ${err.message}`);
  }
});

// Configure default job settings
// 3 retries, exponential backoff starting at 5s (5000ms), and cleaning up completed jobs after 24h
const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
  removeOnComplete: {
    age: 24 * 60 * 60, // 24 hours in seconds
  },
  removeOnFail: false, // Keep failed jobs in redis to allow worker error handler to process/log them
};

export const emailQueue = new Queue('emailQueue', {
  connection: queueConnection,
  defaultJobOptions,
  skipVersionCheck: true,
});

/**
 * Enqueues a new email job into the background queue.
 * 
 * @param {string} jobName - The name/type of the job (e.g., 'sendInvite', 'sendAssignment')
 * @param {Object} payload - The arguments passed to the template wrapper functions
 * @returns {Promise<Object>} The enqueued BullMQ Job object
 */
export async function enqueueEmail(jobName, payload) {
  try {
    const job = await emailQueue.add(jobName, payload);
    logger.info(`Successfully enqueued email job. name=${jobName} jobId=${job.id}`);
    return job;
  } catch (error) {
    logger.error(`Failed to enqueue email job name=${jobName}: ${error.message}`, {
      payload,
      stack: error.stack,
    });
    throw error;
  }
}
