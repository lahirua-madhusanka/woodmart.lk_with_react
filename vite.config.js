import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Keep vendor chunks stable and isolate large dependencies.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (
            id.includes("react") ||
            id.includes("react-dom") ||
            id.includes("react-router")
          ) {
            return "vendor-react";
          }

          if (id.includes("@stripe") || id.includes("stripe")) {
            return "vendor-stripe";
          }

          if (
            id.includes("framer-motion") ||
            id.includes("lucide-react") ||
            id.includes("react-toastify")
          ) {
            return "vendor-ui";
          }

          return "vendor-misc";
        },
      },
    },
  },
});