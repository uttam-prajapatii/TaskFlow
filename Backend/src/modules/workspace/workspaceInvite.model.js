import mongoose from "mongoose";
const {Schema} =  mongoose;

const InviteSchema = new Schema({
  workspaceId: { 
    type: Schema.Types.ObjectId,
     ref: 'Workspace', required: true },
  email: { 
    type: String, 
    required: true, 
    lowercase: true },
  role: { 
    type: String, 
    enum: ['admin', 'member', 'viewer'], 
    default: 'member' },
  invitedBy: { 
    type: Schema.Types.ObjectId,
     ref: 'User', 
     required: true },
  token: { 
    type: String, 
    required: true, 
    unique: true },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'expired'],
    default: 'pending' },
  expiresAt: { 
    type: Date, 
    required: true }
}, { timestamps: true });

// TTL index — auto-remove expired invites
InviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const WorkspaceInvite = mongoose.model('WorkspaceInvites', InviteSchema);