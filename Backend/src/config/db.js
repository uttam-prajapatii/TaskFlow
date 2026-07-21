import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const connectDB = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI || 'mongodb://localhost:27017/taskflow';

    const conn = await mongoose.connect(mongoUri);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`Database connection error: ${error.message}`, { stack: error.stack });
    process.exit(1);
  }
};

export default connectDB;
