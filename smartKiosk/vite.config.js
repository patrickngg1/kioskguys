import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Whenever the frontend tries to access /api,
      // redirect it to the Django server.
      '/api': 'http://127.0.0.1:8000',
    },
  },
});
