import mongoose from 'mongoose';

const { Schema } = mongoose;

const NotificationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['invite', 'task', 'board', 'system'],
    required: true
  },
  payload: {
    type: Schema.Types.Mixed,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for fast querying of a user's unread/read notifications by date descending
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', NotificationSchema);
