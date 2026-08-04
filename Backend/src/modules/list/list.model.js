import mongoose from 'mongoose';
import '../board/board.model.js';
import '../task/task.model.js';

const { Schema } = mongoose;

const ListSchema = new Schema({
  boardId: {
    type: Schema.Types.ObjectId,
    ref: 'Board',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 60
  },
  position: {
    type: Number,
    required: true,
    default: 0
  },
  taskOrder: {
    type: [Schema.Types.ObjectId],
    ref: 'Task',
    default: []
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  createdAt: { type: Date, default: Date.now }
});

ListSchema.index({ boardId: 1, position: 1 });

export const List = mongoose.model('List', ListSchema);