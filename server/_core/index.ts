// Server bootstrap v2.6 — S14 fix
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

async function installPythonDeps(mlDir: string): Promise<void> {
  const reqFile = path.join(mlDir, "requirements.txt");
  return new Promise((resolve) => {
    const pip = spawn("pip3", ["install", "-q", "-r", reqFile], {
      cwd: mlDir,
      stdio: ["ignore", "pipe", "pipe"],
    });
    pip.on("error", () => resolve()); // pip not found — skip
    pip.on("exit", () => resolve());
  });
}

async function waitForFlask(port: number, maxRetries = 20, delayMs = 500): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`http://localhost:${port}/health`);
      if (res.ok) return true;
    } catch (_) { /* not ready yet */ }
    await new Promise(r => setTimeout(r, delayMs));
  }
  return false;
}

function startFlaskServer(scriptName: string, port: number) {
  const mlDir = path.resolve(__dirname, "../../ml");
  const proc = spawn("python3", [path.join(mlDir, scriptName)], {
    cwd: mlDir,
    detached: false,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ML_PORT: String(port), PYTHONUNBUFFERED: "1" },
  });
  // Gracefully handle spawn errors (e.g. python3 not installed in container)
  proc.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "ENOENT") {
      console.warn(`[Flask:${port}] python3 not found — ML/PDF service will run in fallback mode.`);
    } else {
      console.error(`[Flask:${port}] spawn error: ${err.message}`);
    }
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
    if (code !== null) console.log(`[Flask:${port}] process exited with code ${code}`);
  });
  return proc;
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ─── Start Python ML services ──────────────────────────────────────────────
  const mlDir = path.resolve(__dirname, "../../ml");
  // Install Python dependencies if requirements.txt exists
  console.log("[ML] Installing Python dependencies...");
  await installPythonDeps(mlDir);

  const mlClassifierAvailable = await isPortAvailable(5001);
  if (mlClassifierAvailable) {
    console.log("[ML] Starting classifier server on port 5001...");
    startFlaskServer("classifier_server.py", 5001);
    // Wait up to 10s for Flask to be ready
    const ready = await waitForFlask(5001, 20, 500);
    if (ready) {
      console.log("[ML] Classifier server ready on port 5001");
    } else {
      console.warn("[ML] Classifier server did not respond in time — ML features may be unavailable");
    }
  } else {
    console.log("[ML] Classifier server already running on port 5001");
  }

  const mlPdfAvailable = await isPortAvailable(5002);
  if (mlPdfAvailable) {
    console.log("[ML] Starting PDF server on port 5002...");
    startFlaskServer("pdf_server.py", 5002);
    await waitForFlask(5002, 10, 500);
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
  // SSE proxy: /api/ml-train-stream → Flask :5001/train-stream
  app.get("/api/ml-train-stream", async (req, res) => {
    const ML_URL = process.env.ML_SERVICE_URL ?? "http://localhost:5001";
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    try {
      const upstream = await fetch(`${ML_URL}/train-stream`);
      if (!upstream.body) {
        res.write(`data: {"type":"error","message":"Flask não retornou stream"}\n\n`);
        res.end();
        return;
      }
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      req.on("close", () => { try { reader.cancel(); } catch {} });
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.write(`data: {"type":"error","message":${JSON.stringify(msg)}}\n\n`);
    }
    res.end();
  });

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
