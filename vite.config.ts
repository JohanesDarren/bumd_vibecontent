import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

/**
 * Stamps index.html with the build time so a running browser can be checked
 * against the deployed build. This makes "I still see the old UI" verifiable
 * instead of guesswork.
 */
function buildStamp(): Plugin {
  const stamp = new Date().toISOString()
  return {
    name: 'build-stamp',
    transformIndexHtml(html) {
      return html.replace('__BUILD_STAMP__', stamp)
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), buildStamp()],
  server: { proxy: { '/api': { target: 'http://127.0.0.1:3005' } } },
  build: {
    // Vendor code changes rarely; keeping it in its own chunk means a UI deploy
    // does not invalidate the React/lucide download in returning browsers.
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('/react/')) return 'react';
            if (id.includes('lucide-react')) return 'icons';
            return 'vendor';
          }
          return undefined;
        }
      }
    }
  }
})
