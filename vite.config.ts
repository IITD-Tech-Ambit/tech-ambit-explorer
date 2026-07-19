import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const extraHosts =
    env.VITE_DEV_ALLOWED_HOSTS?.split(",")
      .map((h) => h.trim())
      .filter(Boolean) ?? [];

  return {
    server: {
      host: "::",
      port: 5173,
      // Extra hosts (e.g. tunnels) via VITE_DEV_ALLOWED_HOSTS=host1,host2 in .env
      allowedHosts: ["localhost", "127.0.0.1", "::1", "::", ...extraHosts],
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
  };
});
