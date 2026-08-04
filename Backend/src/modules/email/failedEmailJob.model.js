import mongoose from 'mongoose';
const { Schema } = mongoose;

const FailedEmailJobSchema = new Schema({
  jobId: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  data: {
    type: Schema.Types.Mixed,
  },
  failedReason: {
    type: String,
  },
  stacktrace: {
    type: [String],
  },
  failedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Index for query optimization
FailedEmailJobSchema.index({ name: 1, failedAt: -1 });

export const FailedEmailJob = mongoose.model('FailedEmailJobs', FailedEmailJobSchema);
