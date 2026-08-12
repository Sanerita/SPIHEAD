import { Request, Response, NextFunction, RequestHandler } from 'express';

export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  statusCode: number;
  details?: any;
}

export interface ApiSuccessResponse<T = any> {
  success: true;
  message?: string;
  data?: T;
  [key: string]: any;
}

/**
 * Custom API Error class with HTTP status code and optional details
 */
export class ApiError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode = 500, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Sends a standardized success JSON response
 */
export function sendSuccess<T>(
  res: Response,
  data?: T,
  statusCode = 200,
  message?: string
): Response {
  const payload: ApiSuccessResponse<T> = {
    success: true,
    ...(message ? { message } : {}),
    ...(data !== undefined ? (typeof data === 'object' && !Array.isArray(data) ? data : { data }) : {})
  };
  return res.status(statusCode).json(payload);
}

/**
 * Formats database errors or standard errors into structured JSON response
 */
export function sendError(
  res: Response,
  error: unknown,
  defaultStatus = 500,
  defaultMessage = 'An unexpected server error occurred'
): Response {
  let statusCode = defaultStatus;
  let errorMessage = defaultMessage;
  let details: any = undefined;

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    errorMessage = error.message;
    details = error.details;
  } else if (error instanceof Error) {
    errorMessage = error.message;
    const msgLower = error.message.toLowerCase();

    // Categorize DB & network connection errors
    if (
      msgLower.includes('connection') ||
      msgLower.includes('neon') ||
      msgLower.includes('econnrefused') ||
      msgLower.includes('timeout') ||
      msgLower.includes('database') ||
      msgLower.includes('postgres')
    ) {
      statusCode = 503; // Service Unavailable / DB issues
      errorMessage = 'Database service is temporarily unavailable or connecting. Please try again.';
      details = { originalError: error.message };
    } else if (msgLower.includes('unauthorized') || msgLower.includes('jwt') || msgLower.includes('token')) {
      statusCode = 401;
    } else if (msgLower.includes('forbidden') || msgLower.includes('permission')) {
      statusCode = 403;
    } else if (msgLower.includes('not found')) {
      statusCode = 404;
    } else if (msgLower.includes('duplicate') || msgLower.includes('unique constraint') || msgLower.includes('already exists')) {
      statusCode = 409;
      errorMessage = 'A record with these details already exists.';
    }
  }

  // Guarantee JSON headers and prevent HTML fallback pages
  res.setHeader('Content-Type', 'application/json');

  const responsePayload: ApiErrorResponse = {
    success: false,
    error: errorMessage,
    message: errorMessage,
    statusCode,
    ...(details ? { details } : {})
  };

  return res.status(statusCode).json(responsePayload);
}

/**
 * Async handler wrapper to automatically catch errors and return JSON
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => sendError(res, err));
  };
}

/**
 * Validates required body fields, throwing ApiError(400) if any missing
 */
export function validateRequiredFields(body: any, requiredFields: string[]): void {
  if (!body || typeof body !== 'object') {
    throw new ApiError('Invalid or missing JSON request body', 400);
  }

  const missing = requiredFields.filter((field) => {
    const val = body[field];
    return val === undefined || val === null || (typeof val === 'string' && val.trim() === '');
  });

  if (missing.length > 0) {
    throw new ApiError(`Missing required fields: ${missing.join(', ')}`, 400, { missingFields: missing });
  }
}

/**
 * Express middleware for catching global API errors and returning JSON
 */
export function apiErrorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): Response {
  console.error(`[API Error] ${req.method} ${req.path}:`, err);
  return sendError(res, err);
}

/**
 * Middleware for 404 handler on API routes ensuring JSON is always returned
 */
export function apiNotFoundHandler(req: Request, res: Response): Response {
  res.setHeader('Content-Type', 'application/json');
  return res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.originalUrl}`,
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist on this server.`,
    statusCode: 404
  });
}
