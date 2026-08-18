// src/api/index.ts
import { Router, Request, Response, NextFunction } from 'express';
import authRouter from './auth.js';
import leadsRouter from './leads.js';
import mailRouter from './mail.js';

const apiRouter = Router();

// ============================================
// ROUTE MOUNTING
// ============================================

// Mount all route modules
apiRouter.use('/auth', authRouter);
apiRouter.use('/leads', leadsRouter);
apiRouter.use('/mail', mailRouter);

// ============================================
// HEALTH CHECK
// ============================================

apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// ============================================
// API STATUS
// ============================================

apiRouter.get('/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'SPIHEAD API is running',
    timestamp: new Date().toISOString(),
    routes: {
      auth: '/api/auth',
      leads: '/api/leads',
      mail: '/api/mail',
      health: '/api/health'
    }
  });
});

// ============================================
// 404 NOT FOUND HANDLER
// ============================================

export function apiNotFoundHandler(req: Request, res: Response): Response {
  return res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    statusCode: 404,
    timestamp: new Date().toISOString()
  });
}

// ============================================
// GLOBAL ERROR HANDLER
// ============================================

export function apiErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): Response {
  // Log the error with details
  console.error('❌ [API Error]', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    error: err.message,
    stack: err.stack
  });

  // Determine status code
  const statusCode = err.status || err.statusCode || 500;
  
  // Build error response
  const errorResponse: any = {
    success: false,
    error: err.message || 'Internal server error',
    statusCode: statusCode,
    timestamp: new Date().toISOString()
  };

  // Add stack trace in development only
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = err.details || null;
  }

  return res.status(statusCode).json(errorResponse);
}

// ============================================
// APPLY MIDDLEWARE
// ============================================

// Apply 404 handler - catches all unmatched routes
apiRouter.use(apiNotFoundHandler);

// Apply error handler - catches all errors
apiRouter.use(apiErrorHandler);

// ============================================
// EXPORTS
// ============================================

export default apiRouter;
export { apiRouter };
