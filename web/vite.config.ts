import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const apiPort = process.env.PORT ?? '8787';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': `http://127.0.0.1:${apiPort}` },
  },
  build: {
    // Firefox ESR / Chrome 128 on macOS Catalina are both covered by Vite 7's default target.
    target: 'baseline-widely-available',
  },
});
