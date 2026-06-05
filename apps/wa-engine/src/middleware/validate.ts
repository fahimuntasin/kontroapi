import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstError = result.error.issues[0];
      return res.status(400).json({
        success: false,
        message: firstError ? `${firstError.path.join('.')}: ${firstError.message}` : 'Invalid request body',
      });
    }
    req.body = result.data;
    next();
  };
}
