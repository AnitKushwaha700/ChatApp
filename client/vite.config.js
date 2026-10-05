import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'ChatApp',
        short_name: 'ChatApp',
        description: 'A modern chat application',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/pwa-icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/pwa-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ],
        display: 'standalone',
        background_color: '#ffffff'
      }
    })
  ],
});
