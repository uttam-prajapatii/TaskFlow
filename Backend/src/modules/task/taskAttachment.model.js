import mongoose from "mongoose"
import '../task.model.js'
import '../auth/user.model.js'

const { Schema } = mongoose;

const taskAttachmentSchema = new Schema(
{
  taskId:{
    type: Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },       // which task it belongs to
  fileName: {
    type:String,
    required:true,
    trim: true
  },       // original file name
  storageKey: {
    type:String,
    required:true,
    trim: true
  },     // path/key in S3/Cloudinary
  fileUrl: {
    type:String,
    trim:true,
    required:true,
  },        // public/signed URL
  mimeType: {
    type:String,
    required:true
  },       // image/png, application/pdf, etc.
  sizeBytes: {
    type:Number,
    required:true
  },
  uploadedBy: {
    type:Schema.Types.ObjectId,
    ref:'User',
    required:true
  },   // ref User
  createdAt: {
    type:Date,
    
  }
})

export const TaskAttachment = mongoose.model('TaskAttachment', taskAttachmentSchema);