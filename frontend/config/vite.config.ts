import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

const frontendRoot = path.resolve(import.meta.dirname, "..");
const projectRoot = path.resolve(frontendRoot, "..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, "");
  const apiTarget = env.VITE_API_PROXY_TARGET ?? "http://localhost:3000";

  return {
    plugins: [react(), tailwindcss(), jsxLocPlugin()],
    resolve: {
      alias: {
        "@": path.resolve(frontendRoot, "src"),
        "@shared": path.resolve(projectRoot, "backend", "shared"),
        "@assets": path.resolve(projectRoot, "attached_assets"),
      },
    },
    envDir: projectRoot,
    root: frontendRoot,
    publicDir: path.resolve(frontendRoot, "public"),
    build: {
      outDir: path.resolve(frontendRoot, "dist"),
      emptyOutDir: true,
    },
    server: {
      host: true,
      port: 5173,
      strictPort: false,
      proxy: {
        "/api": { target: apiTarget, changeOrigin: true },
      },
    },
  };
});
