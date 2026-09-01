import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  // En el servidor la app cuelga de /convocatoria/bnb/ (Caddy reverse-proxy),
  // no de la raiz del dominio. En dev se mantiene '/' para no romper el proxy local.
  base: command === 'build' ? '/convocatoria/bnb/' : '/',
  server: {
    port: 5175,
    proxy: {
      '/api': {
        // Puerto del backend local. Se puede mover con BACKEND_PORT cuando otra
        // app de la maquina ya ocupa el 8000.
        target: `http://localhost:${process.env.BACKEND_PORT || 8000}`,
        changeOrigin: true,
      },
    },
  },
}))
