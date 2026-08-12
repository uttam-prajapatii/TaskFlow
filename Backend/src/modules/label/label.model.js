import mongoose from 'mongoose';

const { Schema } = mongoose;

const LabelSchema = new Schema({
  boardId: {
    type: Schema.Types.ObjectId,
    ref: 'Board',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  color: {
    type: String,
    required: true,
    default: '#4F46E5'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure label name is unique within a board
LabelSchema.index({ boardId: 1, name: 1 }, { unique: true });

export const Label = mongoose.model('Label', LabelSchema);
export default Label;
