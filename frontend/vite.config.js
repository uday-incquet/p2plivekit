import { defineConfig } from 'vite'
import vue2 from '@vitejs/plugin-vue2'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'

export default defineConfig({
  plugins: [vue2(), basicSsl()],
  server: {
    https: true,
    host: true, // expose on LAN (0.0.0.0)
    proxy: {
      // REST API
      '/rooms': { target: 'http://localhost:3000', changeOrigin: true },
      '/token': { target: 'http://localhost:3000', changeOrigin: true },
      // WebSocket — all WS connections to /ws are proxied to the backend
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
        changeOrigin: true,
        rewrite: path => path.replace(/^\/ws/, ''),
      },
    },
  },
  resolve: {
    alias: {
      vue: path.resolve(__dirname, 'node_modules/vue/dist/vue.esm.js'),
    },
  },
})
