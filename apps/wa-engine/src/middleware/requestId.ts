import { randomBytes } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = randomBytes(8).toString('hex');
  res.setHeader('X-Request-ID', id);
  req.headers['x-request-id'] = id;
  next();
}
