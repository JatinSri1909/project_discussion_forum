import http from 'http';
import app from './app';
import env from './config/environment';
import logger from './lib/logger';
import { initTrendingScoreUpdater } from './lib/scheduler';
import NotificationHandler from './lib/notification-handler';

// Create HTTP server instance
const server = http.createServer(app);

// Initialize WebSocket notification handler
const notificationHandler = new NotificationHandler(server);

// Start the server
server.listen(env.PORT, () => {
  logger.info(`Server is running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  
  // Initialize background jobs
  initTrendingScoreUpdater();
});

// Handle graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down server...');
  
  // Close notification handler
  notificationHandler.shutdown();
  
  // Close HTTP server
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...', {
    error: err.message,
    stack: err.stack
  });
  shutdown();
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', {
    error: err.message,
    stack: err.stack
  });
  shutdown();
});

// Handle termination signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);