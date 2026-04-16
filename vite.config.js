import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/layout':    { target: 'http://localhost:8000', changeOrigin: true },
      '/kpis':      { target: 'http://localhost:8000', changeOrigin: true },
      '/analytics': { target: 'http://localhost:8000', changeOrigin: true },
      '/health':    { target: 'http://localhost:8000', changeOrigin: true },
      '/source':    { target: 'http://localhost:8000', changeOrigin: true },
      '/stream':    { target: 'http://localhost:8000', changeOrigin: true },
    },

  },
})

