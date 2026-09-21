import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Base relativa: funciona en GitHub Pages (usuario.github.io/repo/),
  // en subrutas y en dominios propios sin cambiar nada.
  base: './',
  plugins: [react(), tailwindcss()],
})
