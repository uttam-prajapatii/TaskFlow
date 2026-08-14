import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    googleId: {
      type: String,
      default: null,
    },
    githubId: {
      type: String,
      default: null,
    },
    password: {
      type: String,
      required: [
        function() {
          return !this.googleId && !this.githubId;
        },
        'Password is required',
      ],
      select: false, // Prevent password from being returned in standard queries
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

export default User;
