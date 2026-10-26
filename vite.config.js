import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true
  },
  plugins: [
    react(),
    tailwindcss(),
    // Allow single-file bundling when building standalone offline HTML
    process.env.SINGLE_FILE === 'true' ? viteSingleFile() : null
  ].filter(Boolean),
  base: './', // Relative base path so files work opened directly from disk or any subdirectory
});
