import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const FLASK_PORT = parseInt(process.env.FLASK_PORT || '5001', 10);
const isProd = process.env.NODE_ENV === 'production';

let flaskProcess: ChildProcess | null = null;

function startFlaskBackend() {
  console.log(`[CineMatch] Spawning Python Flask backend on port ${FLASK_PORT}...`);
  flaskProcess = spawn('python3', ['-m', 'backend.app'], {
    cwd: __dirname,
    env: { ...process.env, FLASK_PORT: String(FLASK_PORT), PYTHONPATH: __dirname },
    stdio: 'inherit',
  });

  flaskProcess.on('error', (err) => {
    console.error('[CineMatch] Failed to start Flask process:', err);
  });

  flaskProcess.on('exit', (code, signal) => {
    console.log(`[CineMatch] Flask process exited with code ${code}, signal ${signal}`);
  });
}

// Handle clean shutdown
process.on('SIGINT', () => {
  if (flaskProcess) flaskProcess.kill('SIGINT');
  process.exit(0);
});
process.on('SIGTERM', () => {
  if (flaskProcess) flaskProcess.kill('SIGTERM');
  process.exit(0);
});

async function createServer() {
  startFlaskBackend();

  const app = express();

  // Proxy all /api requests directly to Flask backend
  app.use('/api', express.raw({ type: '*/*', limit: '10mb' }), async (req, res) => {
    const targetUrl = `http://127.0.0.1:${FLASK_PORT}/api${req.url}`;
    try {
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers)) {
        if (key.toLowerCase() !== 'host' && typeof value === 'string') {
          headers[key] = value;
        }
      }

      const fetchOptions: RequestInit = {
        method: req.method,
        headers,
      };

      if (req.method !== 'GET' && req.method !== 'HEAD' && req.body && Buffer.isBuffer(req.body) && req.body.length > 0) {
        fetchOptions.body = new Uint8Array(req.body);
      }

      const response = await fetch(targetUrl, fetchOptions);
      res.status(response.status);

      response.headers.forEach((val, key) => {
        if (key.toLowerCase() !== 'content-encoding') {
          res.setHeader(key, val);
        }
      });

      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (err: any) {
      console.error(`[Proxy Error] Failed to proxy ${req.method} ${targetUrl}:`, err.message);
      res.status(502).json({ error: 'Backend service unavailable or initializing. Please retry in a few seconds.' });
    }
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CineMatch AI] Full-stack application running at http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('[CineMatch AI] Server startup failure:', err);
  process.exit(1);
});
