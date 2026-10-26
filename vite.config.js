import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'fs';
import path from 'path';

function syncLocalDataPlugin() {
  return {
    name: 'sync-local-data-plugin',
    configureServer(server) {
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
