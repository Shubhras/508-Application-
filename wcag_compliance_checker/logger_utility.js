const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'grey'
};

// Tell winston about our colors
winston.addColors(colors);

// Define which logs to show based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define format for console logs
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define format for file logs
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports array
const transports = [
  // Console transport
  new winston.transports.Console({
    level: level(),
    format: consoleFormat
  })
];

// Add file transports only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
  
  // Ensure logs directory exists
  const fs = require('fs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );

  // HTTP access log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'access.log'),
      level: 'http',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: level(),
  levels,
  format: fileFormat,
  transports,
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.Console({
      format: consoleFormat
    })
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.Console({
      format: consoleFormat
    })
  ],
  // Exit on handled exceptions
  exitOnError: false
});

// Create a stream object for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

// Add helper methods
logger.logApiRequest = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.originalUrl || req.url,
    status: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    timestamp: new Date().toISOString()
  };

  if (res.statusCode >= 400) {
    logger.warn('API Request Failed', logData);
  } else {
    logger.http('API Request', logData);
  }
};

logger.logAccessibilityCheck = (type, url, duration, results) => {
  const logData = {
    type,
    url,
    duration: `${duration}ms`,
    totalIssues: results.summary?.total || 0,
    errors: results.summary?.errors || 0,
    warnings: results.summary?.warnings || 0,
    score: results.summary?.score || 0,
    timestamp: new Date().toISOString()
  };

  logger.info('Accessibility Check Completed', logData);
};

logger.logError = (error, context = {}) => {
  const errorData = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...context,
    timestamp: new Date().toISOString()
  };

  logger.error('Application Error', errorData);
};

logger.logPerformance = (operation, duration, metadata = {}) => {
  const perfData = {
    operation,
    duration: `${duration}ms`,
    ...metadata,
    timestamp: new Date().toISOString()
  };

  if (duration > 5000) {
    logger.warn('Slow Operation', perfData);
  } else {
    logger.info('Performance Log', perfData);
  }
};

logger.logSecurityEvent = (event, details = {}) => {
  const securityData = {
    event,
    ...details,
    timestamp: new Date().toISOString(),
    severity: 'security'
  };

  logger.warn('Security Event', securityData);
};

// Export logger instance
module.exports = logger;