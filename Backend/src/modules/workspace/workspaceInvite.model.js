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
    enum: ['pending', 'accepted', 'declined', 'expired', 'revoked'],
    default: 'pending' },
  expiresAt: { 
    type: Date, 
    required: true },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// TTL index — auto-remove expired invites after 7 days
InviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export const WorkspaceInvite = mongoose.models.WorkspaceInvite || mongoose.model('WorkspaceInvite', InviteSchema, 'workspaceinvites');
if (!mongoose.models.WorkspaceInvites) {
  mongoose.model('WorkspaceInvites', InviteSchema, 'workspaceinvites');
}