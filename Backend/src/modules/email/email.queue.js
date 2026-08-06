import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import logger from '../../utils/logger.js';

// Parse Redis connection URL
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Configure persistent redis connection for the queue
// BullMQ requires maxRetriesPerRequest to be null
const queueConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

queueConnection.on('error', (error) => {
  logger.error(`Redis connection error on emailQueue: ${error.message}`, {
    stack: error.stack,
  });
});

queueConnection.on('connect', () => {
  logger.info(`emailQueue Redis connection established: ${redisUrl}`);
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
