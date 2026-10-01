import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5175,
    // Dev only: forward API calls to the local backend so no CORS setup is
    // needed. In production VITE_API_BASE_URL points at the real API.
    proxy: { '/api': 'http://localhost:8000' },
  },
})
