import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/layout': 'http://localhost:8000',
      '/kpis':   'http://localhost:8000',
      '/source': 'http://localhost:8000',
      '/analytics': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/nlq':    'http://localhost:8000',
      '/datasources': 'http://localhost:8000',
      '/ws':     { target: 'ws://localhost:8000', ws: true },
    },
  },
});
