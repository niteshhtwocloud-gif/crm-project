import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The admin panel is pinned to 5173. Without an explicit port here both
    // apps race for the same one, and whichever starts second silently moves
    // to another port (or fails), which looked like "vendor panel not running".
    port: 5175,
    strictPort: true,
    host: true
  },
  preview: {
    port: 5175
  }
})
