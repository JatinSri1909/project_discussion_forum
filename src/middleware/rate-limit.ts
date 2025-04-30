import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import { ApiResponse } from '../types';

// In-memory fallback if Redis is not available
const limiter = new RateLimiterMemory({
  points: 100, // Number of points
  duration: 60, // Per 60 seconds
});

// Create different limiters for different actions
const createLimiter = (points: number, duration: number) => {
  return new RateLimiterMemory({
    points,
    duration,
  });
};

// Specific limiters
const postLimiter = createLimiter(5, 300); // 5 posts per 5 minutes
const commentLimiter = createLimiter(10, 60); // 10 comments per minute
const voteLimiter = createLimiter(30, 60); // 30 votes per minute
const searchLimiter = createLimiter(20, 60); // 20 searches per minute

export const rateLimiters = {
  default: limiter,
  post: postLimiter,
  comment: commentLimiter,
  vote: voteLimiter,
  search: searchLimiter,
};

export const rateLimit = (type: keyof typeof rateLimiters = 'default') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limiter = rateLimiters[type];
      const key = req.ip || req.socket.remoteAddress || 'unknown';
      
      await limiter.consume(key);
      next();
    } catch (err) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          message: 'Too many requests, please try again later',
          code: 'RATE_LIMIT_EXCEEDED'
        }
      };
      res.status(429).json(response);
    }
  };
};