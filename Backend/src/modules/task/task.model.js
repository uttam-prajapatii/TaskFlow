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
    type: [String],
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
    ref: 'Attachment',
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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
TaskSchema.index({ listId: 1, position: 1 });
TaskSchema.index({ boardId: 1, isArchived: 1 });
TaskSchema.index({ assignees: 1 });
TaskSchema.index({ title: 'text', description: 'text' }); // full-text search
TaskSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

TaskSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export const Task = mongoose.model('Task', TaskSchema);