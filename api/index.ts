import { createApiApp } from './_serverApp.js';

const app = createApiApp();

export const config = {
  maxDuration: 60,
};

/**
 * Vercel Serverless entry point.
 * Restores the full `/api/...` pathname when Vercel rewrites `/api/(.*)` -> `/api/index?__path=$1`
 * before delegating cleanly to the shared Express application.
 */
export default function handler(req: any, res: any) {
  if (typeof req?.url === 'string') {
    const parsed = new URL(req.url, 'http://localhost');
    const rewrittenPath = parsed.searchParams.get('__path') || req?.query?.__path;
    if (rewrittenPath) {
      const rawPath = Array.isArray(rewrittenPath) ? rewrittenPath[0] : rewrittenPath;
      parsed.searchParams.delete('__path');
      const qs = parsed.searchParams.toString();
      req.url = `/api/${String(rawPath).replace(/^\/+/, '')}${qs ? `?${qs}` : ''}`;
    }
  }
  return app(req, res);
}
