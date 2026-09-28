import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Full license texts of every bundled package, required by their MIT/ISC/BSD/Apache notices.
    license: { fileName: 'third-party-licenses.md' },
  },
  server: {
    port: 5005,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:8005' },
  },
})
