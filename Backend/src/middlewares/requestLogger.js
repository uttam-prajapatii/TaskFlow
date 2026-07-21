import morgan from 'morgan';
import logger from '../utils/logger.js';

// Custom write stream redirecting morgan output to winston
const stream = {
  write: (message) => logger.http(message.trim()),
};

// Skip logging during automated test runs
const skip = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'test';
};

// Setup request logger with a structured format
const requestLogger = morgan(
  ':remote-addr :method :url :status :res[content-length] - :response-time ms',
  { stream, skip }
);

export default requestLogger;
