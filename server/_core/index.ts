import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { applySecurityMiddleware } from "../security";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

function startFlaskServer(scriptName: string, port: number) {
  const mlDir = path.resolve(__dirname, "../../ml");
  const proc = spawn("python3", [path.join(mlDir, scriptName)], {
    cwd: mlDir,
    detached: false,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ML_PORT: String(port) },
  });
  proc.stdout?.on("data", (d: Buffer) => {
    const msg = d.toString().trim();
    if (msg) console.log(`[Flask:${port}] ${msg}`);
  });
  proc.stderr?.on("data", (d: Buffer) => {
    const msg = d.toString().trim();
    if (msg && !msg.includes("WARNING") && !msg.includes("Debugger")) {
      console.error(`[Flask:${port}] ${msg}`);
    }
  });
  proc.on("exit", (code: number | null) => {
    console.log(`[Flask:${port}] process exited with code ${code}`);
  });
  return proc;
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ─── Start Python ML services ───────────────────────────────────────────────
  const mlClassifierAvailable = await isPortAvailable(5001);
  if (mlClassifierAvailable) {
    console.log("[ML] Starting classifier server on port 5001...");
    startFlaskServer("classifier_server.py", 5001);
  } else {
    console.log("[ML] Classifier server already running on port 5001");
  }

  const mlPdfAvailable = await isPortAvailable(5002);
  if (mlPdfAvailable) {
    console.log("[ML] Starting PDF server on port 5002...");
    startFlaskServer("pdf_server.py", 5002);
  } else {
    console.log("[ML] PDF server already running on port 5002");
  }

  // ─── Security Middleware (req. 6.5, 6.6, 6.7) ──────────────────────────────
  // Applied BEFORE body parsers and route handlers.
  applySecurityMiddleware(app);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
