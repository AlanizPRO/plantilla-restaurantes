import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import cliente from './src/cliente.json'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'datos-del-cliente',
      transformIndexHtml: (html) => html
        .replaceAll('%NOMBRE_APP%', cliente.nombreApp)
        .replaceAll('%NOMBRE_CORTO%', cliente.nombreCorto)
        .replaceAll('%COLOR%', cliente.colorPrincipal),
    },
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icono-180.png'],
      manifest: {
        name: cliente.nombreApp,
        short_name: cliente.nombreCorto,
        description: cliente.descripcion,
        start_url: '/',
        display: 'standalone',
        background_color: cliente.colorFondo,
        theme_color: cliente.colorPrincipal,
        icons: [
          { src: '/icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: { navigateFallback: '/index.html', navigateFallbackDenylist: [/^\/__\//] },
    }),
  ],
})
