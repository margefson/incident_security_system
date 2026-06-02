/**
 * security.ts — Centralized security middleware (req. 6.5, 6.6, 6.7)
 *
 * Applied in backend/src/_core/index.ts before all routes.
 */
import cors from "cors";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Application } from "express";

// ─── 6.7 Helmet ───────────────────────────────────────────────────────────────
// Removes X-Powered-By, sets X-Content-Type-Options: nosniff,
// and enables Strict-Transport-Security (HSTS).
export const helmetMiddleware = helmet({
  // Remove X-Powered-By header (hides Express fingerprint)
  hidePoweredBy: true,
  // X-Content-Type-Options: nosniff (prevents MIME sniffing)
  noSniff: true,
  // Strict-Transport-Security: max-age=31536000 (1 year), includeSubDomains
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  // Content-Security-Policy: allow same-origin and trusted CDNs
  contentSecurityPolicy: false, // Disabled to avoid blocking the SPA in dev
  // X-Frame-Options: SAMEORIGIN (clickjacking protection)
  frameguard: { action: "sameorigin" },
  // X-XSS-Protection: 0 (modern browsers use CSP instead)
  xssFilter: false,
});

// ─── 6.6 CORS ─────────────────────────────────────────────────────────────────
const isProduction = process.env.NODE_ENV === "production";

const configuredOrigins = [
  process.env.FRONTEND_URL ?? "http://localhost:5173",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  ...(process.env.ADDITIONAL_ORIGINS
    ? process.env.ADDITIONAL_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
    : []),
];

const DEV_VITE_PORTS = new Set(["5173", "5174", "4173"]);

/** Em dev, aceita Vite em localhost ou IP da rede (ex.: http://10.x.x.x:5174). */
function isDevFrontendOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (!DEV_VITE_PORTS.has(url.port)) return false;
    const host = url.hostname;
    if (host === "localhost" || host === "127.0.0.1") return true;
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  } catch {
    return false;
  }
  return false;
}

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (configuredOrigins.includes(origin)) {
      return callback(null, true);
    }
    if (!isProduction && isDevFrontendOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: Origin '${origin}' not allowed`), false);
  },
  credentials: true, // Allow cookies (session cookie)
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

// ─── 6.5 Rate Limiting ────────────────────────────────────────────────────────

/**
 * Global rate limit na API: 100 req/IP/15min (produção).
 * Em desenvolvimento o limite é alto para não bloquear Vite/HMR/tRPC.
 * Aplicado apenas em /api (não conta assets do frontend).
 */
export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 10_000,
  standardHeaders: true,  // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,   // Disable X-RateLimit-* headers
  message: {
    error: "Muitas requisições. Tente novamente em 15 minutos.",
  },
  // Use ipKeyGenerator for IPv6-safe IP extraction (takes IP string, not req)
  keyGenerator: (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    const rawIp = Array.isArray(forwarded)
      ? forwarded[0]
      : (forwarded?.split(",")[0] ?? req.ip ?? "127.0.0.1");
    return ipKeyGenerator(rawIp.trim());
  },
});

/**
 * Auth rate limit: 10 requests per IP per 15 minutes.
 * Applied only to authentication endpoints (/api/trpc/auth.*).
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 10 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Muitas tentativas de autenticação. Tente novamente em 15 minutos.",
  },
  // Use ipKeyGenerator for IPv6-safe IP extraction (takes IP string, not req)
  keyGenerator: (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    const rawIp = Array.isArray(forwarded)
      ? forwarded[0]
      : (forwarded?.split(",")[0] ?? req.ip ?? "127.0.0.1");
    return ipKeyGenerator(rawIp.trim());
  },
});

/**
 * Apply all security middleware to the Express app.
 * Call this before registering any routes.
 */
export function applySecurityMiddleware(app: Application): void {
  // 6.7 — Helmet (security headers)
  app.use(helmetMiddleware);

  // 6.6 — CORS (restrict origins)
  app.use(corsMiddleware);

  // 6.5 — Rate limit só em rotas /api (Vite, HMR e assets não entram na conta)
  app.use("/api", globalRateLimit);

  // 6.5 — Auth-specific rate limit em /api/trpc/auth.*
  app.use("/api/trpc/auth", authRateLimit);
}
