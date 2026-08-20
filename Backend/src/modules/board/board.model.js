import mongoose from "mongoose";
import "../list/list.model.js";
import "../task/task.model.js";
import "../auth/user.model.js";

const { Schema } = mongoose;

const BoardSchema = new Schema({
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 300,
    default: ''
  },
  listOrder: {
    type: [Schema.Types.ObjectId],
    ref: 'List',
    default: []
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  visibility: {
    type: String,
    enum: ['workspace', 'private'],
    default: 'workspace'
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  isDeleted:{
    type: Boolean,
    default: false
  },
  deletedAt:{
    type: Date,
    default: null
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

BoardSchema.index({ workspaceId: 1, isArchived: 1 });
BoardSchema.index({ workspaceId: 1, isDeleted: 1, isArchived: 1, createdAt: -1 });
BoardSchema.index({ workspaceId: 1, isDeleted: 1, visibility: 1, createdBy: 1 });

BoardSchema.pre('save', function (next) {
  if(this.isDeleted){
    this.deletedAt = Date.now();
  }
  this.updatedAt = Date.now();
  next();
});

export const Board = mongoose.model('Board', BoardSchema);
