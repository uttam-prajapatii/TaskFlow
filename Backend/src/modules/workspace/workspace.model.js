import mongoose from "mongoose";
import { MemberSchema } from "./member.model.js";
const {Schema} = mongoose;

const WorkspaceSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  logoUrl: {
    type: String,
    default: null
  },
  accentColor: {
    type: String,
    default: '#4F46E5'
  },
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: {
    type: [MemberSchema],
    default: []
  },
  settings: {
    allowViewerComments: { type: Boolean, default: true },
    inviteExpiryDays: {
      type: Number,
      default: 7
    }
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  isDeleted:{
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
WorkspaceSchema.index(
  { slug: 1 },
  { 
    unique: true, 
    partialFilterExpression: { isDeleted: false } 
  }
);
WorkspaceSchema.index({ 'members.userId': 1 });
WorkspaceSchema.index({ ownerId: 1 });

WorkspaceSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export const Workspace = mongoose.model('Workspaces', WorkspaceSchema);