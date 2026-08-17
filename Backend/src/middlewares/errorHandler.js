import logger from '../utils/logger.js';
import fs from 'fs';

/**
 * Global centralized Express error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Clean up uploaded file if request fails before service handles deletion
  if (req.file && req.file.path) {
    fs.unlink(req.file.path, (unlinkErr) => {
      if (unlinkErr) {
        logger.warn(`Failed to clean up uploaded file ${req.file.path}: ${unlinkErr.message}`);
      } else {
        logger.info(`Cleaned up local file in error handler: ${req.file.path}`);
      }
    });
  }

  // Log error using Winston (this automatically records to console and error.log)
  logger.error(`${err.message} - ${req.method} ${req.originalUrl} - IP: ${req.ip}`, {
    stack: err.stack,
    statusCode: err.statusCode,
  });

  // Development response (Detailed with stack trace)
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err,
    });
  }

  // Production response
  if (err.isOperational) {
    // Trusted operational error: send friendly message to client
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  // Untrusted programming or external error: don't leak details
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong on the server',
  });
};

export default errorHandler;
