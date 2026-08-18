import { Router, Request, Response, NextFunction } from 'express';
import authRouter from './auth.js';
import leadsRouter from './leads.js';
import mailRouter from './mail.js';

const apiRouter = Router();

// Mount routes
apiRouter.use('/auth', authRouter);
apiRouter.use('/leads', leadsRouter);
apiRouter.use('/mail', mailRouter);

// Health check
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Export 404 handler
export function apiNotFoundHandler(req: Request, res: Response): Response {
  return res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    statusCode: 404
  });
}

// Export error handler
export function apiErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): Response {
  console.error('API Error:', err);
  return res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

// Apply middleware to router
apiRouter.use(apiNotFoundHandler);
apiRouter.use(apiErrorHandler);

export default apiRouter;
