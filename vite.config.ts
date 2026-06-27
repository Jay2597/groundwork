import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Pure static build — no backend. Output is a folder you can host on any
// static host (or open offline). Nothing is sent to a server at runtime.
export default defineConfig({
  // Relative base so the build runs from any host or sub-path (Netlify, Pages, file://).
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split the canvas engine and React into their own chunks so the app
        // shell (Home, routing) doesn't pay for Konva up front.
        manualChunks: {
          konva: ["konva", "react-konva"],
          react: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
});
