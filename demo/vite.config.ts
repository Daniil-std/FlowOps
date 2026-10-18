import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true },
  preview: { port: 5173, strictPort: true },
  worker: { format: 'es' },
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', testTimeout: 15000 },
});
