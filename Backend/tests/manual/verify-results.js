import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../../src/config/db.js';
import { FailedEmailJob } from '../../src/modules/email/failedEmailJob.model.js';

dotenv.config();

async function run() {
  await connectDB();

  const failedJobs = await FailedEmailJob.find().sort({ failedAt: -1 });
  console.log(`\n--- FAILED EMAIL JOBS IN DATABASE (Count: ${failedJobs.length}) ---`);
  failedJobs.forEach((job) => {
    console.log(`- Job ID: ${job.jobId}`);
    console.log(`  Name: ${job.name}`);
    console.log(`  Recipient: ${job.data?.toEmail || job.data?.to}`);
    console.log(`  Reason: ${job.failedReason}`);
    console.log(`  Failed At: ${job.failedAt}\n`);
  });

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
