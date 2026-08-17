import { toastService } from './toastService';

export interface ApiFetchOptions extends RequestInit {
  /** If true, error toasts will not be automatically displayed */
  silent?: boolean;
  /** Custom error message title/override for error toast */
  customErrorToast?: string;
  /** Skip auto-adding Authorization header */
  skipAuth?: boolean;
}

export class ApiError extends Error {
  public statusCode: number;
  public statusText: string;
  public data: any;

  constructor(message: string, statusCode: number, statusText: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.statusText = statusText;
    this.data = data;
  }
}

/**
 * Global API fetch wrapper with centralized error handling for status codes (400, 401, 500, etc.)
 * and automated user notifications via the toast system.
 */
export async function apiFetch<T = any>(
  url: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { silent = false, customErrorToast, skipAuth = false, ...fetchInit } = options;

  const headers = new Headers(fetchInit.headers || {});
  if (!headers.has('Content-Type') && !(fetchInit.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Inject session token if available
  if (!skipAuth && !headers.has('Authorization')) {
    const sessionToken = localStorage.getItem('spihead_auth_session_token');
    if (sessionToken) {
      headers.set('Authorization', `Bearer ${sessionToken}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, { ...fetchInit, headers });
  } catch (netErr: any) {
    const errorMsg = 'Network Error: Unable to communicate with the server. Please check your connection.';
    console.error(`[API Network Error] ${url}:`, netErr);
    if (!silent) {
      toastService.showToast(errorMsg, 'error');
    }
    throw new ApiError(errorMsg, 0, 'NETWORK_ERROR', netErr);
  }

  // Handle successful responses (200-299)
  if (response.ok) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return (await response.json()) as T;
    }
    const text = await response.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  // Handle HTTP error status codes (400, 401, 500, etc.)
  const status = response.status;
  let responseData: any = null;
  let serverMessage = '';

  try {
    const text = await response.text();
    try {
      responseData = JSON.parse(text);
      serverMessage = responseData?.error || responseData?.message || responseData?.details || '';
    } catch {
      serverMessage = text || '';
    }
  } catch (e) {
    // Ignore parse error
  }

  let userFriendlyMessage = '';

  switch (status) {
    case 400:
      userFriendlyMessage = serverMessage
        ? `Bad Request (400): ${serverMessage}`
        : 'Bad Request (400): The server could not process the request due to invalid inputs.';
      break;

    case 401:
      userFriendlyMessage = serverMessage
        ? `Unauthorized (401): ${serverMessage}`
        : 'Session Expired (401): Your authentication session is invalid or expired. Please sign in again.';
      break;

    case 403:
      userFriendlyMessage = serverMessage
        ? `Forbidden (403): ${serverMessage}`
        : 'Access Denied (403): You do not have permission to perform this action.';
      break;

    case 404:
      userFriendlyMessage = serverMessage
        ? `Not Found (404): ${serverMessage}`
        : 'Resource Not Found (404): The requested resource or endpoint was not found.';
      break;

    case 500:
    case 502:
    case 503:
    case 504:
      userFriendlyMessage = serverMessage
        ? `Server Error (${status}): ${serverMessage}`
        : `Server Error (${status}): An internal server error occurred. Please try again later.`;
      break;

    default:
      userFriendlyMessage = serverMessage
        ? `Request Failed (${status}): ${serverMessage}`
        : `Request Failed (${status}): An unexpected error occurred on the server.`;
      break;
  }

  const finalToastMsg = customErrorToast || userFriendlyMessage;

  console.error(`[API HTTP ${status}] ${url}:`, {
    status,
    statusText: response.statusText,
    serverMessage,
    responseData,
  });

  if (!silent) {
    toastService.showToast(finalToastMsg, 'error');
  }

  throw new ApiError(userFriendlyMessage, status, response.statusText, responseData);
}

/**
 * Convenience API Client methods
 */
export const apiClient = {
  get: <T = any>(url: string, options?: ApiFetchOptions) =>
    apiFetch<T>(url, { ...options, method: 'GET' }),

  post: <T = any>(url: string, body?: any, options?: ApiFetchOptions) =>
    apiFetch<T>(url, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    }),

  put: <T = any>(url: string, body?: any, options?: ApiFetchOptions) =>
    apiFetch<T>(url, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    }),

  patch: <T = any>(url: string, body?: any, options?: ApiFetchOptions) =>
    apiFetch<T>(url, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    }),

  delete: <T = any>(url: string, options?: ApiFetchOptions) =>
    apiFetch<T>(url, { ...options, method: 'DELETE' }),
};
