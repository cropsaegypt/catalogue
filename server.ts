import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createApiApp } from './serverApp';

async function startServer() {
  const app = createApiApp();
  const PORT = Number(process.env.PORT) || 3000;

  // Serve persisted product images locally
  const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');
  fs.mkdirSync(path.join(uploadsRoot, 'ai-products'), { recursive: true });
  app.use('/uploads', express.static(uploadsRoot));

  // Vite Middleware for Development Mode / Dist for Node Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CROPSA Server] Express server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[CROPSA Server Error]', err);
  process.exit(1);
});
