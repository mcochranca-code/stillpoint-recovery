import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // The NA guide text (© NA World Services, personal use on this device only) gets its own chunk.
          // It is opt-in, fetched only after the reader is turned on, and kept out of the precache.
          if (/\/src\/data\/na-step-guides\/(?:index\.ts|guide\.json)$/.test(id)) return 'na-step-guides-text';
          // The small facts module (title, path, credit) is shared with the app shell; keep it out of the text chunk.
          if (id.endsWith('/src/data/na-step-guides/meta.ts')) return 'na-step-guides-meta';
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/scheduler/')) return 'vendor-react';
          if (id.includes('/node_modules/dexie')) return 'vendor-storage';
          if (id.includes('/node_modules/framer-motion/') || id.includes('/node_modules/motion/')) return 'vendor-motion';
          if (id.includes('/node_modules/react-router/')) return 'vendor-router';
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: ['.us3.manus.computer'],
    proxy: {
      '/api': { target: 'http://127.0.0.1:3001', changeOrigin: false },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}', 'server/**/*.test.mjs'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 55,
        lines: 80,
      },
    },
  },
});
