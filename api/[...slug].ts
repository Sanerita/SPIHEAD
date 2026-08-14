import { createApp } from "../src/createApp";

let appPromise: Promise<any> | null = null;

export default async function handler(req: any, res: any) {
  try {
    if (!appPromise) {
      appPromise = createApp();
    }
    const app = await appPromise;

    let targetUrl = req.url || '';

    // If req.url is already a valid clean /api path (e.g. /api/auth/signup), keep it as is
    if (targetUrl.startsWith('/api/') && !targetUrl.startsWith('/api/index') && !targetUrl.startsWith('/api/[...slug]')) {
      // Intact path
    } else if (req.query && req.query.slug) {
      const slugPath = Array.isArray(req.query.slug) ? req.query.slug.join('/') : req.query.slug;
      const queryString = targetUrl.includes('?') ? '?' + targetUrl.split('?')[1] : '';
      targetUrl = '/api/' + slugPath + queryString;
    } else if (req.headers['x-forwarded-uri'] && typeof req.headers['x-forwarded-uri'] === 'string') {
      targetUrl = req.headers['x-forwarded-uri'];
    }

    if (!targetUrl || targetUrl === '/') {
      targetUrl = '/api';
    } else if (!targetUrl.startsWith('/api')) {
      targetUrl = '/api' + (targetUrl.startsWith('/') ? targetUrl : '/' + targetUrl);
    }

    req.url = targetUrl;

    return app(req, res);
  } catch (err: any) {
    console.error("Vercel Serverless Function Error in api/[...slug]:", err);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: err?.message || "Internal Server Error",
      });
    }
  }
}
