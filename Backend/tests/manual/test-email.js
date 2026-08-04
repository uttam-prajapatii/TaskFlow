import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { enqueueEmail } from '../../src/modules/email/email.queue.js';
import connectDB from '../../src/config/db.js';
import { Task } from '../../src/modules/workspace/task.model.js';
import User from '../../src/modules/auth/user.model.js';
import { Workspace } from '../../src/modules/workspace/workspace.model.js';

dotenv.config();

async function run() {
  await connectDB();

  const inviteEmail = 'cricketeamofficial@gmail.com';
  const assignEmail = 'cricketeamofficial@gmail.com';
  const mentionEmail = 'cricketeamofficial@gmail.com';
  const dueDateReminderEmail = 'cricketeamofficial@gmail.com';
  const passwordResetEmail = 'cricketeamofficial@gmail.com';

  console.log('Enqueuing individual email template jobs...');

  // 1. Invite Email
  await enqueueEmail('sendInvite', {
    toEmail: inviteEmail,
    workspaceName: 'Acme Rockets',
    inviteToken: 'xyz-secure-token-123',
  });

  // 2. Assignment Email
  await enqueueEmail('sendAssignment', {
    toEmail: assignEmail,
    taskTitle: 'Implement background email queue worker',
    assignedByName: 'Alex ProjectManager',
    taskUrl: 'https://taskflow.app/workspaces/w1/tasks/t1',
  });

  // 3. Mention Email
  await enqueueEmail('sendMention', {
    toEmail: mentionEmail,
    mentionedByName: 'Sarah Developer',
    commentSnippet: 'Please check the Redis config on production, the retry backoff might need tuning.',
    taskUrl: 'https://taskflow.app/workspaces/w1/tasks/t1',
  });

  // 4. Due Date Reminder Email
  await enqueueEmail('sendDueDateReminder', {
    toEmail: dueDateReminderEmail,
    taskTitle: 'Prepare Q3 slide deck',
    dueDate: new Date(Date.now() + 18 * 60 * 60 * 1000), // 18 hours from now
    taskUrl: 'https://taskflow.app/workspaces/w1/tasks/t2',
  });

  // 5. Password Reset Email
  await enqueueEmail('sendPasswordReset', {
    toEmail: passwordResetEmail,
    resetToken: 'reset-token-abcd-9876',
  });

  // 6. Setup mock database records to test the Repeatable Cron Job (dueDateReminder scanner)
  console.log('\nSetting up mock DB records for the cron reminder scanner...');
  
  // Find or create dummy user
  let user = await User.findOne({ email: inviteEmail });
  if (!user) {
    user = await User.create({
      email: inviteEmail,
      password: 'dummy-password-hash-12345',
      fullName: 'Cron Target User',
      isActive: true,
    });
    console.log(`Created new mock User: ${user._id} (${user.email})`);
  } else {
    console.log(`Found existing mock User: ${user._id} (${user.email})`);
  }

  // Find or create dummy workspace
  let workspace = await Workspace.findOne({ slug: 'cron-test-workspace' });
  if (!workspace) {
    workspace = await Workspace.create({
      name: 'Cron Test Workspace',
      slug: 'cron-test-workspace',
      ownerId: user._id,
      members: [{ userId: user._id, role: 'admin' }],
    });
    console.log(`Created new mock Workspace: ${workspace._id} (${workspace.slug})`);
  } else {
    console.log(`Found existing mock Workspace: ${workspace._id} (${workspace.slug})`);
  }

  // Clean up any old test task to avoid database bloat
  await Task.deleteMany({ title: 'Cron Test Task' });

  // Create a new task due in 12 hours (needs to trigger due date scanner)
  const mockTask = await Task.create({
    title: 'Cron Test Task',
    dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
    assignedTo: user._id,
    isCompleted: false,
    dueDateReminderSent: false,
    workspaceId: workspace._id,
  });

  console.log(`Created mock Task: ID=${mockTask._id}, title="${mockTask.title}", dueDate=${mockTask.dueDate}`);
  console.log('All email test jobs enqueued successfully!');

  // Pause briefly before closing connection
  setTimeout(async () => {
    await mongoose.disconnect();
    console.log('Database disconnected. Test script finished.');
    process.exit(0);
  }, 2000);
}

run().catch(async (err) => {
  console.error('Test run encountered an error:', err);
  await mongoose.disconnect();
  process.exit(1);
});
