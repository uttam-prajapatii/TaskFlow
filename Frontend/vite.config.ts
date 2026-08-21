import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('@tanstack')) {
              return 'vendor-query';
            }
            if (id.includes('axios')) {
              return 'vendor-http';
            }
          }
        },
      },
    },
  },
});
