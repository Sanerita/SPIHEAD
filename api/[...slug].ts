import { createApp } from "../src/createApp.js";

let appPromise: Promise<any> | null = null;

export default async function handler(req: any, res: any) {
  if (!appPromise) {
    appPromise = createApp();
  }
  const app = await appPromise;

  // Ensure request URL preserves /api prefix if stripped by Vercel rewrite
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  return app(req, res);
}

