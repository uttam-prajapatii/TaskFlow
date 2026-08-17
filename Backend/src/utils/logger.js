import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

// Define filename and dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log files directory relative to this file
const LOG_DIR = path.join(__dirname, '../../logs');

// Define custom levels and colors
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
  }
};

winston.addColors(customLevels.colors);

const istTimestampFormat = () => {
  const date = new Date();
  const kolkataTime = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const year = kolkataTime.getFullYear();
  const month = String(kolkataTime.getMonth() + 1).padStart(2, '0');
  const day = String(kolkataTime.getDate()).padStart(2, '0');
  const hours = String(kolkataTime.getHours()).padStart(2, '0');
  const minutes = String(kolkataTime.getMinutes()).padStart(2, '0');
  const seconds = String(kolkataTime.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms} IST`;
};

// JSON formatting for file logs (combined & error)
const formatFile = winston.format.combine(
  winston.format.timestamp({ format: istTimestampFormat }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Clear, colorized format for the console (local / Docker output)
const formatConsole = winston.format.combine(
  winston.format.timestamp({ format: istTimestampFormat }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `[${info.timestamp}] [${info.level}]: ${info.message}${info.stack ? `\nStack: ${info.stack}` : ''}`
  )
);

// Create the winston logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  levels: customLevels.levels,
  format: formatFile,
  transports: [
    // Write all errors to error.log
    new winston.transports.File({ 
      filename: path.join(LOG_DIR, 'error.log'), 
      level: 'error' 
    }),
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: path.join(LOG_DIR, 'combined.log') 
    }),
  ],
});

// Always write to console in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: formatConsole,
  }));
}

export default logger;
