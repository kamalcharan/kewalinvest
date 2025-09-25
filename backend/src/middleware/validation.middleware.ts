import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';

export const validateRequest = (schema: Schema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { error, value } = schema.validate(req.body, { 
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true
      });

      if (error) {
        const errorMessages = error.details.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message
        }));

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errorMessages
        });
        return;
      }

      req.body = value;
      next();
    } catch (err) {
      console.error('Validation middleware error:', err);
      res.status(500).json({
        success: false,
        error: 'Internal validation error'
      });
    }
  };
};