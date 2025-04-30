import { Response } from 'express';
import logger from './logger';
import { ApiResponse } from '../types';

export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

interface ErrorResponse {
  message: string;
  code: string;
  details?: any;
}

export const handleError = (
  error: Error | AppError,
  res: Response
): void => {
  let statusCode = 500;
  let errorResponse: ErrorResponse = {
    message: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR'
  };

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorResponse = {
      message: error.message,
      code: error.code
    };

    // Log operational errors
    if (error.isOperational) {
      logger.warn(`Operational error: ${error.message}`, {
        code: error.code,
        stack: error.stack
      });
    } else {
      // Log programming or other unhandled errors
      logger.error(`Unhandled error: ${error.message}`, {
        code: error.code,
        stack: error.stack
      });
    }
  } else {
    // Unknown errors
    logger.error(`Unknown error: ${error.message}`, {
      stack: error.stack
    });
  }

  const response: ApiResponse<null> = {
    success: false,
    error: errorResponse
  };

  res.status(statusCode).json(response);
};

// Common error factories
export const createNotFoundError = (resource: string): AppError => {
  return new AppError(
    `${resource} not found`,
    `${resource.toUpperCase()}_NOT_FOUND`,
    404
  );
};

export const createValidationError = (details: any): AppError => {
  return new AppError(
    'Validation failed',
    'VALIDATION_ERROR',
    400,
    true
  );
};

export const createUnauthorizedError = (message = 'Unauthorized'): AppError => {
  return new AppError(
    message,
    'UNAUTHORIZED',
    401
  );
};

export const createForbiddenError = (message = 'Forbidden'): AppError => {
  return new AppError(
    message,
    'FORBIDDEN',
    403
  );
};

export const createRateLimitError = (): AppError => {
  return new AppError(
    'Too many requests',
    'RATE_LIMIT_EXCEEDED',
    429
  );
};