import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "icons/*.png"],
      manifest: {
        name: "VIKO EIF Timetable",
        short_name: "VIKO EIF",
        description: "VIKO EIF lecture timetable — view your class schedule and get daily Telegram notifications.",
        theme_color: "#005baa",
        background_color: "#060c14",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        categories: ["education", "utilities"],
        icons: [
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            // Maskable icon — Android adaptive icons use this for rounded/squircle shapes
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico,json,woff2}"],
        // Serve cached version when offline
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            urlPattern: /\/rpr\/server\/maindbi|\/timetable\/server\/currenttt/,
            handler: "NetworkFirst",
            options: {
              cacheName: "timetable-api",
              expiration: { maxEntries: 20, maxAgeSeconds: 86400 },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react:    ["react", "react-dom", "react-router-dom"],
          firebase: ["firebase/app", "firebase/database"],
          utils:    ["moment", "react-toastify"],
        },
      },
    },
  },
});
