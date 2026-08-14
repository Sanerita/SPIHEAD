import { createApp } from "../src/createApp";

let appPromise: Promise<any> | null = null;

export default async function handler(req: any, res: any) {
  try {
    if (!appPromise) {
      appPromise = createApp();
    }
    const app = await appPromise;

    if (req.query && req.query.slug) {
      const slugPath = Array.isArray(req.query.slug) ? req.query.slug.join('/') : req.query.slug;
      const queryString = req.url && req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
      req.url = '/api/' + slugPath + queryString;
    } else if (req.headers['x-forwarded-uri']) {
      req.url = req.headers['x-forwarded-uri'];
    } else if (req.url && !req.url.startsWith('/api')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }

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


