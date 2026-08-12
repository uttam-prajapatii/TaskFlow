import mongoose from 'mongoose';

const { Schema } = mongoose;

const StarredBoardSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  boardId: {
    type: Schema.Types.ObjectId,
    ref: 'Board',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// A user can star a board only once
StarredBoardSchema.index({ userId: 1, boardId: 1 }, { unique: true });

export const StarredBoard = mongoose.model('StarredBoard', StarredBoardSchema);
export default StarredBoard;
