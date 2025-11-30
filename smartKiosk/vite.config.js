import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: '.', // ⭐ ensure Vite uses THIS folder as root
  publicDir: 'public', // ⭐ set public directory
  base: '/', // ⭐ avoid broken /src paths

  plugins: [react()],

  server: {
    host: 'localhost',
    port: 5173,

    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // ⭐ correct alias
    },
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
