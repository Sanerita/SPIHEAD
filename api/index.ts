import { createApp } from "../src/createApp.js";

// Vercel rewrites preserve the ORIGINAL incoming req.url inside the function
// (the "destination" in vercel.json only decides which function handles the
// request, it does not rewrite req.url itself), so this can stay simple:
// Express sees the real path (e.g. "/api/auth/login") and routes normally.
let appPromise: Promise<any> | null = null;

export default async function handler(req: any, res: any) {
  try {
    if (!appPromise) {
      appPromise = createApp();
    }
    const app = await appPromise;
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
