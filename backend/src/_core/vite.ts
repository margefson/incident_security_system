import express, { type Express } from "express";
import fs from "fs";
import path from "path";

/** Serve o build estático do frontend (após `pnpm --dir frontend build`). */
export function serveStatic(app: Express) {
  const distPath =
    process.env.FRONTEND_DIST_PATH ??
    path.resolve(import.meta.dirname, "..", "..", "..", "frontend", "dist");

  if (!fs.existsSync(distPath)) {
    console.warn(
      `[Static] Pasta não encontrada: ${distPath}. Execute: pnpm --dir frontend build`
    );
  }

  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
