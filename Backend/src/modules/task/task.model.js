import mongoose from "mongoose";
import "../list/list.model.js"
import "../board/board.model.js"

const { Schema } = mongoose;

const ChecklistItemSchema = new Schema({
  text: { type: String, required: true, maxlength: 150 },
  isDone: { type: Boolean, default: false }
}, { _id: true });

const TaskSchema = new Schema({
  listId: {
    type: Schema.Types.ObjectId,
    ref: 'List',
    required: true
  },
  boardId: {
    type: Schema.Types.ObjectId,
    ref: 'Board',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 150
  },
  description: {
    type: String,
    default: '',
    maxlength: 5000
  },
  assignees: {
    type: [Schema.Types.ObjectId],
    ref: 'User',
    default: []
  },
  labels: {
    type: [Schema.Types.ObjectId],
    ref: 'Label',
    default: []
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  dueDate: {
    type: Date,
    default: null
  },
  checklist: {
    type: [ChecklistItemSchema],
    default: []
  },
  attachments: {
    type: [Schema.Types.ObjectId],
    ref: 'TaskAttachment',
    default: []
  },
  position: {
    type: Number,
    required: true,
    default: 0
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  dueDateReminderSent: {
    type: Boolean,
    default: false
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
TaskSchema.index({ listId: 1, position: 1 });
TaskSchema.index({ boardId: 1, isArchived: 1 });
TaskSchema.index({ assignees: 1 });
TaskSchema.index({ title: 'text', description: 'text' }); // full-text search
TaskSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
TaskSchema.index({ isCompleted: 1 });
TaskSchema.index({ dueDateReminderSent: 1, dueDate: 1 });

TaskSchema.pre('save', function (next) {
  this.updatedAt = Date.now();

  // Dynamic isCompleted calculation
  if (!this.checklist || this.checklist.length === 0) {
    this.isCompleted = false;
  } else {
    this.isCompleted = this.checklist.every((item) => item.isDone);
  }

  // Reset dueDateReminderSent if dueDate was modified
  if (this.isModified('dueDate')) {
    this.dueDateReminderSent = false;
  }

  next();
});

TaskSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (!update) return next();

  // Handle checklist update
  if (update.checklist !== undefined) {
    const cl = update.checklist;
    if (!cl || cl.length === 0) {
      update.isCompleted = false;
    } else {
      update.isCompleted = cl.every((item) => item.isDone);
    }
  } else if (update.$set && update.$set.checklist !== undefined) {
    const cl = update.$set.checklist;
    if (!cl || cl.length === 0) {
      update.$set.isCompleted = false;
    } else {
      update.$set.isCompleted = cl.every((item) => item.isDone);
    }
  }

  // Handle dueDate update to reset reminder sent status
  if (update.dueDate !== undefined) {
    if (update.$set) {
      update.$set.dueDateReminderSent = false;
    } else {
      update.dueDateReminderSent = false;
    }
  } else if (update.$set && update.$set.dueDate !== undefined) {
    update.$set.dueDateReminderSent = false;
  }

  next();
});

export const Task = mongoose.model('Task', TaskSchema);