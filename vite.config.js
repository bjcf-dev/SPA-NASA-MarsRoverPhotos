import { defineConfig } from 'vite'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  server: { port: 5173 },
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.js',
  },
  resolve: {
    alias: {
      // Redirige cualquier import antiguo de "mars-gallery/src/*" a "src/*"
      'mars-gallery/src': path.resolve(__dirname, 'src'),
      '@': path.resolve(__dirname, 'src') // opcional pero útil
    }
  }
});
