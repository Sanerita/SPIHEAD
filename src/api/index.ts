// src/api/index.ts
import { Router, Request, Response, NextFunction } from 'express';
import authRouter from './auth.js';
import leadsRouter from './leads.js';
import mailRouter from './mail.js';

const apiRouter = Router();

// ============================================
// ROUTE MOUNTING
// ============================================

// Mount routes
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
    environment: process.env.NODE_ENV || 'development'
  });
});

// ============================================
// DEBUG ENDPOINT - Database Status
// ============================================

// ✅ FIX: Use apiRouter instead of app, and import db/status properly
apiRouter.get('/debug/db', async (req: Request, res: Response) => {
  try {
    // Dynamically import to avoid circular dependencies
    const { db, isDatabaseConnected } = await import('../db/index.js');
    
    const status = {
      database_url: !!process.env.DATABASE_URL,
      db_connected: !!db,
      is_connected: isDatabaseConnected,
      node_env: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    };
    res.json(status);
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: String(error),
      timestamp: new Date().toISOString()
    });
  }
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
  console.error('❌ [API Error]', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    error: err.message,
    stack: err.stack
  });

  const statusCode = err.status || err.statusCode || 500;
  
  const errorResponse: any = {
    success: false,
    error: err.message || 'Internal server error',
    statusCode: statusCode,
    timestamp: new Date().toISOString()
  };

  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = err.details || null;
  }

  return res.status(statusCode).json(errorResponse);
}

// ============================================
// APPLY MIDDLEWARE
// ============================================

apiRouter.use(apiNotFoundHandler);
apiRouter.use(apiErrorHandler);

// ============================================
// EXPORTS
// ============================================

export default apiRouter;
export { apiRouter };
