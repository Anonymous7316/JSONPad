import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 9002,
    fs: {
        // Allow serving files from one level up to the project root
        // Required for symlinked @/ components to work correctly in monorepo-like setups
        allow: ['..']
    },
    headers: {
        'Permissions-Policy': 'clipboard-write=(self)',
    }
  },
  optimizeDeps: {
     // Sometimes needed for CJS dependencies
  },
  build: {
     // Build options
  }
})
