import dotenv from 'dotenv';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import mongoose from 'mongoose';
import connectDB from '../../config/db.js';
import logger from '../../utils/logger.js';
import { Task } from '../task/task.model.js';
import { FailedEmailJob } from './failedEmailJob.model.js';
import { emailQueue, enqueueEmail } from './email.queue.js';
import {
  sendInviteEmail,
  sendAssignmentEmail,
  sendMentionEmail,
  sendDueDateReminderEmail,
  sendPasswordResetEmail,
  sendOtpEmail,
} from './email.service.js';
import { redisUrl, redisConfig } from '../../config/redis.js';
import { TaskAttachment } from '../task/taskAttachment.model.js';
import { deleteFromCloudinary } from '../../config/cloudinary.js';
import { getCloudinaryResourceType } from '../task/task.utils.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();


// Log the Redis host (obfuscating credentials)
try {
  const parsedUrl = new URL(redisUrl);
  logger.info(`emailWorker connecting to Redis host: ${parsedUrl.host} (protocol: ${parsedUrl.protocol})`);
} catch (e) {
  logger.warn(`emailWorker could not parse REDIS_URL for logging: ${e.message}`);
}

// Configure Redis connection for worker
const workerConnection = new IORedis(redisUrl, redisConfig);

workerConnection.on('error', (error) => {
  logger.error(`Redis connection error on email worker: ${error.message}`, {
    stack: error.stack,
  });
});

workerConnection.on('connect', async () => {
  logger.info(`emailWorker Redis connection established: ${redisUrl.replace(/:[^@]+@/, ':****@')}`);
  try {
    const whoami = await workerConnection.call('ACL', 'WHOAMI');
    logger.info(`emailWorker authenticated Redis user: ${whoami}`);
  } catch (err) {
    logger.warn(`emailWorker could not run ACL WHOAMI: ${err.message}`);
  }
});

/**
 * Scan for tasks that are due within the next 24 hours and have not received a reminder yet.
 * Automatically enqueues reminder emails and marks them as sent.
 */
async function scanDueDateReminders() {
  logger.info('Running cron job: Scanning upcoming task due dates...');
  try {
    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find tasks that:
    // 1. Are due between now and the next 24 hours
    // 2. Are not completed
    // 3. Haven't had a due date reminder sent yet
    // 4. Are not deleted
    // 5. Have at least one assignee
    const tasks = await Task.find({
      dueDate: { $gt: now, $lte: twentyFourHoursLater },
      isCompleted: { $ne: true },
      dueDateReminderSent: { $ne: true },
      isDeleted: { $ne: true },
      assignees: { $exists: true, $not: { $size: 0 } },
    }).populate('assignees');

    logger.info(`Due date scanner: Found ${tasks.length} task(s) requiring reminders.`);

    for (const task of tasks) {
      if (task.assignees && task.assignees.length > 0) {
        const appBaseUrl = process.env.APP_BASE_URL;
        const taskUrl = `${appBaseUrl}/boards/${task.boardId}/tasks/${task._id}`;

        for (const assignee of task.assignees) {
          if (assignee.email) {
            // Enqueue individual email sending job
            await enqueueEmail('sendDueDateReminder', {
              toEmail: assignee.email,
              taskTitle: task.title,
              dueDate: task.dueDate,
              taskUrl,
            });
            logger.info(`Queued due date reminder for task "${task.title}" to ${assignee.email}`);
          }
        }

        // Set dueDateReminderSent to true on the Task to deduplicate
        task.dueDateReminderSent = true;
        await task.save();
      }
    }
  } catch (error) {
    logger.error(`Error scanning upcoming task due dates: ${error.message}`, {
      stack: error.stack,
    });
  }
}

// Map of jobs to their service handler functions
const jobRouter = {
  sendInvite: (data) => sendInviteEmail(data),
  sendAssignment: (data) => sendAssignmentEmail(data),
  sendMention: (data) => sendMentionEmail(data),
  sendDueDateReminder: (data) => sendDueDateReminderEmail(data),
  sendPasswordReset: (data) => sendPasswordResetEmail(data),
  sendOtp: (data) => sendOtpEmail(data),
};

/**
 * Handle delayed task hard-deletion and Cloudinary attachment cleanup.
 */
async function handleHardDeleteTask({ taskId }) {
  logger.info(`Running background task: Hard-deleting task ${taskId}...`);
  try {
    const task = await Task.findById(taskId);
    if (!task) {
      logger.info(`Task ${taskId} not found in database (already deleted or did not exist)`);
      return;
    }

    // If task was restored, do not delete
    if (!task.isDeleted) {
      logger.info(`Task ${taskId} is no longer marked as deleted (restored). Aborting hard-delete.`);
      return;
    }

    // Find and delete all attachments from Cloudinary
    const attachments = await TaskAttachment.find({ taskId });
    for (const att of attachments) {
      const resourceType = getCloudinaryResourceType(att.mimeType);
      try {
        await deleteFromCloudinary(att.storageKey, resourceType);
        logger.info(`Cleaned up Cloudinary file: ${att.storageKey}`);
      } catch (err) {
        logger.warn(`Failed to clean up Cloudinary file ${att.storageKey} on task hard-delete: ${err.message}`);
      }
      await att.deleteOne();
    }

    // Delete the task document itself
    await task.deleteOne();
    logger.info(`Task ${taskId} permanently hard-deleted from database`);
  } catch (err) {
    logger.error(`Error hard-deleting task ${taskId}: ${err.message}`, { stack: err.stack });
    throw err;
  }
}

// Initialize worker process
const worker = new Worker('emailQueue', async (job) => {
  const { name, data } = job;
  logger.info(`Worker received job. name=${name} jobId=${job.id}`);

  // Route cron scan jobs
  if (name === 'scanDueDateReminders') {
    await scanDueDateReminders();
    return;
  }

  // Route hard-delete delayed jobs
  if (name === 'hardDeleteTask') {
    await handleHardDeleteTask(data);
    return;
  }

  // Route email sending jobs
  const handler = jobRouter[name];
  if (!handler) {
    throw new Error(`Job type "${name}" is not supported. No handler registered.`);
  }

  await handler(data);
}, {
  connection: workerConnection,
  skipVersionCheck: true,
});

// Event Listeners for logging success/failures
worker.on('completed', (job) => {
  logger.info(`Job completed successfully. name=${job.name} jobId=${job.id}`);
});

worker.on('failed', async (job, error) => {
  if (!job) {
    logger.error(`Job failed without job details: ${error.message}`);
    return;
  }

  const maxAttempts = job.opts.attempts || 3;
  logger.warn(`Job failed. name=${job.name} jobId=${job.id} attemptsMade=${job.attemptsMade}/${maxAttempts} error=${error.message}`);

  // Write to database collection for manual review when the job has permanently failed
  if (job.attemptsMade >= maxAttempts) {
    logger.error(`Job permanently failed after all retry attempts. name=${job.name} jobId=${job.id}`);

    try {
      await FailedEmailJob.create({
        jobId: job.id,
        name: job.name,
        data: job.data,
        failedReason: error.message,
        stacktrace: job.stacktrace || [error.stack],
      });
      logger.info(`Permanently failed job details saved to FailedEmailJobs collection. jobId=${job.id}`);
    } catch (dbError) {
      logger.error(`Failed to log permanently failed job to database collection: ${dbError.message}`, {
        jobId: job.id,
        stack: dbError.stack,
      });
    }
  }
});

/**
 * Registers the hourly due date reminder scanner job on the queue.
 * Utilizes BullMQ repeatable jobs to act as an hourly cron.
 */
async function registerCronJobs() {
  try {
    // Check for existing repeatable jobs to avoid duplicates
    const repeatableJobs = await emailQueue.getRepeatableJobs();
    for (const j of repeatableJobs) {
      if (j.name === 'scanDueDateReminders') {
        logger.info(`Removing old repeatable job schedule. key=${j.key}`);
        await emailQueue.removeRepeatableByKey(j.key);
      }
    }

    // Register repeatable job running hourly at the start of the hour
    await emailQueue.add(
      'scanDueDateReminders',
      {},
      {
        repeat: {
          pattern: '0 * * * *',
        },
        jobId: 'scanDueDateRemindersCron', // Deduplicate job id
      }
    );
    logger.info('Repeatable scanDueDateReminders cron job scheduled successfully (Runs hourly).');
  } catch (error) {
    logger.error(`Failed to register repeatable cron jobs: ${error.message}`, {
      stack: error.stack,
    });
  }
}

// Register Cron jobs when worker starts
registerCronJobs();

// Handle graceful shutdowns
const shutdown = async () => {
  logger.info('Shutting down email worker gracefully...');
  await worker.close();
  await workerConnection.quit();
  await mongoose.disconnect();
  logger.info('Worker shutdown completed.');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

logger.info('Email queue worker is running and listening for jobs...');
export default worker;
