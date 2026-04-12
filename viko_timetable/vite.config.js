import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "VIKO EIF Timetable",
        short_name: "VIKO EIF",
        description: "VIKO EIF lecture timetable — view your class schedule and get daily Telegram notifications.",
        theme_color: "#005baa",
        background_color: "#060c14",
        display: "standalone",
        icons: [
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
      },
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
