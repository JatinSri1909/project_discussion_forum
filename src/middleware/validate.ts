import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ApiResponse } from '../types';

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR'
      }
    };

    return res.status(400).json(response);
  };
};