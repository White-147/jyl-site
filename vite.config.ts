import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// base: './' —— 支持部署在 GitHub Pages 子路径（/portfolio/）下
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
