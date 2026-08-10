import mongoose from 'mongoose';

const { Schema } = mongoose;

const CommentSchema = new Schema({
  taskId: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  authorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  body: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  mentions: {
    type: [Schema.Types.ObjectId],
    ref: 'User',
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index to efficiently query comments of a task sorted by date
CommentSchema.index({ taskId: 1, createdAt: -1 });

export const Comment = mongoose.model('Comment', CommentSchema);
