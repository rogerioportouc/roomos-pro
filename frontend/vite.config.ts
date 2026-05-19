import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          socket: ['socket.io-client'],
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api':     'http://localhost:3000',
      '/ws':      { target: 'ws://localhost:3000', ws: true },
      '/uploads': 'http://localhost:3000',
    }
  }
})
