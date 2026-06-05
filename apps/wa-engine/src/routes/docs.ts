import { Router, type Request, type Response } from 'express';

const router = Router();

// GET /docs — Redirect to dashboard docs (public)
router.get('/docs', (_req: Request, res: Response) => {
  res.redirect('/docs');
});

// Legacy redirect for old path
router.get('/api/openapi.json', (_req: Request, res: Response) => {
  res.status(410).json({ 
    success: false, 
    message: 'OpenAPI spec no longer exposed for security. Visit /docs for API documentation.' 
  });
});

router.get('/api/openapi.yaml', (_req: Request, res: Response) => {
  res.status(410).json({ 
    success: false, 
    message: 'OpenAPI spec no longer exposed for security. Visit /docs for API documentation.' 
  });
});

export default router;