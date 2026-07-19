import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 5173,
    allowedHosts: ["ais710.tufesports.me", "localhost", "127.0.0.1", "::1", "::"],
    // Local edge after nginx removal: same-origin /api|/search|/chat-api → api-gateway.
    // (Prod uses Coolify/Traefik path routing; Docker local publishes gateway :8080.)
    proxy: {
      "/api": { target: "http://127.0.0.1:8080", changeOrigin: true },
      "/search": { target: "http://127.0.0.1:8080", changeOrigin: true },
      "/chat-api": { target: "http://127.0.0.1:8080", changeOrigin: true },
      "/health": { target: "http://127.0.0.1:8080", changeOrigin: true },
      // IP/Patents search: hits SEO-Backend-iitd directly (not yet gRPC-bridged
      // through api-gateway like /search is), proxied same-origin so the
      // credentialed axios client doesn't trip cross-origin CORS.
      "/ip-search-api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ip-search-api/, ""),
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
