import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const coopHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  css: {
    postcss: {},
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    headers: coopHeaders,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    headers: coopHeaders,
  },
});
