import { defineConfig } from "vitest/config";
import path from "path";

const backendRoot = path.resolve(import.meta.dirname, "..");
const projectRoot = path.resolve(backendRoot, "..");

export default defineConfig({
  root: projectRoot,
  resolve: {
    alias: {
      "@shared/const": path.resolve(backendRoot, "shared/const.ts"),
      "@shared/types": path.resolve(backendRoot, "shared/types.ts"),
      "@shared/_core/errors": path.resolve(backendRoot, "shared/_core/errors.ts"),
      "@shared": path.resolve(backendRoot, "shared"),
      "@assets": path.resolve(projectRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["backend/src/tests/**/*.test.ts", "backend/src/**/*.test.ts", "backend/src/**/*.spec.ts"],
  },
});
