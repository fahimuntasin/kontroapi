import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

export function errorHandler(
  err: Error & { statusCode?: number; status?: number; code?: string },
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const status = err.statusCode ?? err.status ?? 500;

  // Always log full error server-side
  logger.error({
    err,
    stack: err.stack,
    url: req.url,
    method: req.method,
    session_id: (req as any).session?.id,
  });

  // Never send stack to client in production
  return res.status(status).json({
    success: false,
    message: status < 500 ? err.message : 'Internal server error',
    code: err.code ?? undefined,
  });
}
