const winston = require('winston');

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'error' : 'info', // Reduce logs in production
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json() // Log in JSON format for CloudWatch compatibility
  ),
  transports: [
    // Log to console (picked up by Elastic Beanstalk for CloudWatch)
    new winston.transports.Console(),
    // Log to a file with rotation to limit disk usage
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5, // Keep 5 rotated files
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// If in development, also log to console in a simpler format
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

module.exports = logger;