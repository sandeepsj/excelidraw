import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? '/excelidraw/' : '/',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  optimizeDeps: {
    include: ['@excalidraw/excalidraw'],
  },
  build: {
    commonjsOptions: {
      include: [/@excalidraw/, /node_modules/],
    },
  },
})
