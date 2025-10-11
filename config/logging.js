const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const setupLogging = () => {
  // Create logs directory if it doesn't exist
  const fs = require('fs');
  const logsDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Define log format
  const logFormat = winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.prettyPrint()
  );

  // Console format for development
  const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
    })
  );

  // Create logger
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'mess-feedback-system' },
    transports: [
      // Error log file
      new DailyRotateFile({
        filename: path.join(logsDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true
      }),

      // Combined log file
      new DailyRotateFile({
        filename: path.join(logsDir, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true
      }),

      // Security log file
      new DailyRotateFile({
        filename: path.join(logsDir, 'security-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'warn',
        maxSize: '20m',
        maxFiles: '30d',
        zippedArchive: true
      })
    ],
    exceptionHandlers: [
      new DailyRotateFile({
        filename: path.join(logsDir, 'exceptions-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true
      })
    ],
    rejectionHandlers: [
      new DailyRotateFile({
        filename: path.join(logsDir, 'rejections-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true
      })
    ]
  });

  // Add console transport for development
  if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: consoleFormat
    }));
  }

  // Security event logging function
  logger.logSecurity = (event, user, details, req) => {
    logger.warn('SECURITY_EVENT', {
      event,
      user: user?.id || user?.username || 'anonymous',
      ip: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('User-Agent'),
      timestamp: new Date().toISOString(),
      details
    });
  };

  // Performance logging function
  logger.logPerformance = (operation, duration, details) => {
    logger.info('PERFORMANCE', {
      operation,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      details
    });
  };

  // Database operation logging
  logger.logDatabase = (operation, table, duration, success, error) => {
    const logData = {
      operation,
      table,
      duration: `${duration}ms`,
      success,
      timestamp: new Date().toISOString()
    };

    if (error) {
      logData.error = error.message;
      logger.error('DATABASE_ERROR', logData);
    } else {
      logger.info('DATABASE_OPERATION', logData);
    }
  };

  return logger;
};

module.exports = { setupLogging };
