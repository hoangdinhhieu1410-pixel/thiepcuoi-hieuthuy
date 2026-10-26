import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'fs';
import path from 'path';
import Redis from 'ioredis';

const REDIS_KEY = 'wedding_wishes_list';
const DEFAULT_REDIS_URL = 'redis://default:1CoqVoDZ9zok85R9QyvXyok7L856XXIh@palatial-clover-caring-84399.db.redis.io:17074';
let redisClient = null;

function getRedis() {
  if (!redisClient) {
    try {
      redisClient = new Redis(process.env.REDIS_URL || DEFAULT_REDIS_URL, {
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
        lazyConnect: true
      });
    } catch (e) {
      console.warn('Redis init warning in Vite:', e);
    }
  }
  return redisClient;
}

function syncLocalDataPlugin() {
  return {
    name: 'sync-local-data-plugin',
    configureServer(server) {
      server.middlewares.use('/api/wishes', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        const redis = getRedis();
        try {
          if (req.method === 'GET') {
            const raw = redis ? await redis.get(REDIS_KEY) : null;
            let wishes = [];
            if (raw) {
              try { wishes = JSON.parse(raw); } catch {}
            }
            res.writeHead(200);
            return res.end(JSON.stringify({ success: true, wishes }));
          }

          if (req.method === 'POST') {
            let chunks = [];
            req.on('data', c => chunks.push(c));
            req.on('end', async () => {
              try {
                const bodyStr = Buffer.concat(chunks).toString('utf8');
                const body = JSON.parse(bodyStr);
                const newWish = {
                  id: body.id || `wish-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  name: String(body.name || '').trim(),
                  message: String(body.message || '').trim(),
                  relationship: (body.relationship || 'Khách quý').trim(),
                  side: body.side === 'bride' ? 'bride' : 'groom',
                  sideLabel: body.sideLabel || (body.side === 'bride' ? 'Nhà Gái' : 'Nhà Trai'),
                  createdAt: 'Vừa xong',
                  timestamp: Date.now()
                };

                let wishes = [];
                if (redis) {
                  const raw = await redis.get(REDIS_KEY);
                  if (raw) {
                    try { wishes = JSON.parse(raw); } catch {}
                  }
                  wishes = [newWish, ...wishes.filter(w => w.id !== newWish.id)];
                  if (wishes.length > 500) wishes = wishes.slice(0, 500);
                  await redis.set(REDIS_KEY, JSON.stringify(wishes));
                }
                res.writeHead(200);
                res.end(JSON.stringify({ success: true, wish: newWish, wishes }));
              } catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
            return;
          }

          if (req.method === 'DELETE') {
            let chunks = [];
            req.on('data', c => chunks.push(c));
            req.on('end', async () => {
              try {
                let id = new URL(req.url, 'http://localhost').searchParams.get('id');
                if (!id && chunks.length > 0) {
                  const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                  id = body?.id;
                }
                let wishes = [];
                if (redis && id) {
                  const raw = await redis.get(REDIS_KEY);
                  if (raw) {
                    try { wishes = JSON.parse(raw); } catch {}
                  }
                  wishes = wishes.filter(w => w.id !== id);
                  await redis.set(REDIS_KEY, JSON.stringify(wishes));
                }
                res.writeHead(200);
                res.end(JSON.stringify({ success: true, wishes }));
              } catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
            return;
          }
          res.writeHead(405).end();
        } catch (e) {
          res.writeHead(500);
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });

      server.middlewares.use('/api/sync-local-data', (req, res) => {
        if (req.method === 'POST') {
          let chunks = [];
          req.on('data', c => chunks.push(c));
          req.on('end', () => {
            try {
              const body = Buffer.concat(chunks).toString('utf8');
              fs.writeFileSync(path.resolve(process.cwd(), 'synced_local_data.json'), body, 'utf8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: true, size: body.length }));
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }
        res.writeHead(405).end();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true
  },
  plugins: [
    syncLocalDataPlugin(),
    react(),
    tailwindcss(),
    // Allow single-file bundling when building standalone offline HTML
    process.env.SINGLE_FILE === 'true' ? viteSingleFile() : null
  ].filter(Boolean),
  base: './', // Relative base path so files work opened directly from disk or any subdirectory
});
