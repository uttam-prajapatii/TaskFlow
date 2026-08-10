import mongoose from 'mongoose';

const { Schema } = mongoose;

const ActivityLogSchema = new Schema({
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  actorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true
  },
  entityType: {
    type: String,
    required: true
  },
  entityId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to quickly fetch paginated logs of a workspace by date descending
ActivityLogSchema.index({ workspaceId: 1, createdAt: -1 });

export const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);
