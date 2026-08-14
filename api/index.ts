import { createApp } from "../src/createApp";

let appPromise: Promise<any> | null = null;

export default async function handler(req: any, res: any) {
  try {
    if (!appPromise) {
      appPromise = createApp();
    }
    const app = await appPromise;

    let targetUrl = req.url || '';

    if (targetUrl.startsWith('/api/') && !targetUrl.startsWith('/api/index')) {
      // Clean path
    } else if (req.headers['x-forwarded-uri'] && typeof req.headers['x-forwarded-uri'] === 'string') {
      targetUrl = req.headers['x-forwarded-uri'];
    } else if (req.query && req.query['0']) {
      const p = Array.isArray(req.query['0']) ? req.query['0'].join('/') : req.query['0'];
      const queryString = targetUrl.includes('?') ? '?' + targetUrl.split('?')[1] : '';
      targetUrl = '/api/' + p + queryString;
    } else {
      targetUrl = '/api';
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
