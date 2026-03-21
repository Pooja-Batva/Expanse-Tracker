import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://expanse-tracker-1-wj18.onrender.com',
        changeOrigin: true,
      }
    }
  }
})
