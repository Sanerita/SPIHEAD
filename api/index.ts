import { createApp } from "../src/createApp";

let appPromise: Promise<any> | null = null;

export default async function handler(req: any, res: any) {
  try {
    if (!appPromise) {
      appPromise = createApp();
    }
    const app = await appPromise;

    let targetUrl = req.url || '';

    // Prefer x-forwarded-uri or x-original-url header if provided by Vercel proxy
    if (req.headers['x-forwarded-uri'] && typeof req.headers['x-forwarded-uri'] === 'string') {
      targetUrl = req.headers['x-forwarded-uri'];
    } else if (req.headers['x-original-url'] && typeof req.headers['x-original-url'] === 'string') {
      targetUrl = req.headers['x-original-url'];
    }

    // Clean up /api/index prefix if internal Vercel rewrite prepended it
    if (targetUrl.startsWith('/api/index')) {
      const rest = targetUrl.replace('/api/index', '');
      if (rest.startsWith('?')) {
        const match = req.url?.match(/[?&]0=([^&]+)/);
        if (match && match[1]) {
          targetUrl = '/api/' + decodeURIComponent(match[1]);
        } else {
          targetUrl = '/api';
        }
      } else {
        targetUrl = rest;
      }
    }

    if (!targetUrl || targetUrl === '/') {
      targetUrl = '/api';
    } else if (!targetUrl.startsWith('/api')) {
      targetUrl = '/api' + (targetUrl.startsWith('/') ? targetUrl : '/' + targetUrl);
    }

    req.url = targetUrl;

    return app(req, res);
  } catch (err: any) {
    console.error("Vercel Serverless Function Error in api/index:", err);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: err?.message || "Internal Server Error",
      });
    }
  }
}
