import { Request, Response, NextFunction, RequestHandler } from 'express';

export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function sendSuccess<T>(
  res: Response,
  data?: T,
  statusCode: number = 200,
  message?: string
): Response {
  return res.status(statusCode).json({
    success: true,
    ...(message && { message }),
    ...(data !== undefined && { data })
  });
}

export function sendError(
  res: Response,
  error: unknown,
  defaultStatus: number = 500,
  defaultMessage: string = 'Internal server error'
): Response {
  let statusCode = defaultStatus;
  let message = defaultMessage;
  let details: any = undefined;

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
    details = error.details;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return res.status(statusCode).json({
    success: false,
    error: message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && { stack: (error as Error).stack })
  });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function validateRequiredFields(body: any, requiredFields: string[]): void {
  if (!body || typeof body !== 'object') {
    throw new ApiError('Invalid request body', 400);
  }

  const missing = requiredFields.filter(field => {
    const val = body[field];
    return val === undefined || val === null || (typeof val === 'string' && val.trim() === '');
  });

  if (missing.length > 0) {
    throw new ApiError(`Missing required fields: ${missing.join(', ')}`, 400, { missingFields: missing });
  }
}

export function apiErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): Response {
  console.error(`[API Error] ${req.method} ${req.path}:`, err);
  return sendError(res, err);
}

export function apiNotFoundHandler(req: Request, res: Response): Response {
  return res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
    statusCode: 404
  });
}
