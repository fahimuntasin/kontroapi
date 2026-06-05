import helmet from 'helmet';
import cors from 'cors';
import { Express, Request, Response, NextFunction } from 'express';
import { config } from '../config';

const ALLOWED_ORIGINS = [
  'https://kontroapi.com',
  'https://www.kontroapi.com',
  ...(config.NODE_ENV === 'development' ? ['http://localhost:3000'] : []),
];

export function applySecurityMiddleware(app: Express): void {
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error('CORS: origin not allowed'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Api-Key'],
    credentials: false,
  }));

  app.disable('x-powered-by');

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({
      success: false,
      message: config.NODE_ENV === 'production'
        ? (status < 500 ? err.message : 'Internal server error')
        : err.message,
      ...(config.NODE_ENV !== 'production' && { stack: err.stack }),
    });
  });
}
