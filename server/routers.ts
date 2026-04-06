import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createLocalUser,
  createIncident,
  deleteIncident,
  getGlobalStats,
  getIncidentById,
  getIncidentRiskStatsByUser,
  getIncidentsByUser,
  getIncidentStatsByUser,
  getUserByEmail,
  upsertUser,
} from "./db";
import { registerSchema, loginSchema, createIncidentSchema, validateJoi } from "./validation";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { sdk } from "./_core/sdk";

// ─── Risk Level Mapping ────────────────────────────────────────────────────
const CATEGORY_RISK: Record<string, "critical" | "high" | "medium" | "low"> = {
  phishing: "high",
  malware: "critical",
  brute_force: "high",
  ddos: "medium",
  vazamento_de_dados: "critical",
  unknown: "low",
};

// ─── ML Classifier Integration ────────────────────────────────────────────
async function classifyIncident(
  title: string,
  description: string
): Promise<{ category: string; confidence: number }> {
  try {
    const response = await fetch("http://localhost:5001/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("ML service error");
    const data = (await response.json()) as { category: string; confidence: number };
    return data;
  } catch {
    // Fallback: keyword-based classification
    return fallbackClassify(title, description);
  }
}

function fallbackClassify(
  title: string,
  description: string
): { category: string; confidence: number } {
  const text = `${title} ${description}`.toLowerCase();
  const scores: Record<string, number> = {
    phishing: 0,
    malware: 0,
    brute_force: 0,
    ddos: 0,
    vazamento_de_dados: 0,
  };
  // Phishing keywords
  const phishingKw = ["phishing", "e-mail", "email", "senha", "credencial", "link", "falso", "fraude", "redirecionamento", "portal falso", "webmail"];
  // Malware keywords
  const malwareKw = ["malware", "vírus", "trojan", "ransomware", "executável", "script", "backdoor", "infecção", "botnet", "powershell", "macro", "binário"];
  // Brute force keywords
  const bruteKw = ["brute", "força bruta", "tentativas", "login", "autenticação", "senha incorreta", "falha", "consecutivas", "repetidas"];
  // DDoS keywords
  const ddosKw = ["ddos", "dos", "tráfego", "requisições", "indisponível", "sobrecarga", "pico", "volume", "simultâneas"];
  // Vazamento keywords
  const vazamentoKw = ["vazamento", "exposição", "dados", "arquivo", "planilha", "destinatário", "não autorizado", "sensível", "compartilhado"];

  for (const kw of phishingKw) if (text.includes(kw)) scores.phishing += 1;
  for (const kw of malwareKw) if (text.includes(kw)) scores.malware += 1;
  for (const kw of bruteKw) if (text.includes(kw)) scores.brute_force += 1;
  for (const kw of ddosKw) if (text.includes(kw)) scores.ddos += 1;
  for (const kw of vazamentoKw) if (text.includes(kw)) scores.vazamento_de_dados += 1;

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (!best || best[1] === 0) return { category: "unknown", confidence: 0 };
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  return { category: best[0], confidence: Math.round((best[1] / total) * 100) / 100 };
}

// ─── Auth Router ───────────────────────────────────────────────────────────
const authRouter = router({
  me: publicProcedure.query((opts) => opts.ctx.user),

  register: publicProcedure
    .input(z.object({ name: z.string(), email: z.string(), password: z.string() }))
    .mutation(async ({ input }) => {
      const validated = validateJoi<{ name: string; email: string; password: string }>(
        registerSchema,
        input
      );
      const existing = await getUserByEmail(validated.email);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Email já cadastrado" });
      const passwordHash = await bcrypt.hash(validated.password, 12);
      const openId = `local_${uuidv4()}`;
      const user = await createLocalUser({
        name: validated.name,
        email: validated.email,
        passwordHash,
        openId,
      });
      return { success: true, userId: user?.id };
    }),

  login: publicProcedure
    .input(z.object({ email: z.string(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const validated = validateJoi<{ email: string; password: string }>(loginSchema, input);
      const user = await getUserByEmail(validated.email);
      if (!user || !user.passwordHash) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenciais inválidas" });
      }
      const valid = await bcrypt.compare(validated.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenciais inválidas" });
      }
      // Update lastSignedIn
      await upsertUser({ openId: user.openId, lastSignedIn: new Date() });
      // Issue session cookie
      const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
      return { success: true };
    }),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
});

// ─── Incidents Router ──────────────────────────────────────────────────────
const incidentsRouter = router({
  create: protectedProcedure
    .input(z.object({ title: z.string(), description: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const validated = validateJoi<{ title: string; description: string }>(
        createIncidentSchema,
        input
      );
      const { category, confidence } = await classifyIncident(
        validated.title,
        validated.description
      );
      const riskLevel = CATEGORY_RISK[category] ?? "low";
      const incident = await createIncident({
        userId: ctx.user.id,
        title: validated.title,
        description: validated.description,
        category: category as "phishing" | "malware" | "brute_force" | "ddos" | "vazamento_de_dados" | "unknown",
        riskLevel,
        confidence,
      });
      return incident;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return getIncidentsByUser(ctx.user.id);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const incident = await getIncidentById(input.id);
      if (!incident) throw new TRPCError({ code: "NOT_FOUND", message: "Incidente não encontrado" });
      if (incident.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      return incident;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const incident = await getIncidentById(input.id);
      if (!incident) throw new TRPCError({ code: "NOT_FOUND", message: "Incidente não encontrado" });
      if (incident.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      await deleteIncident(input.id, ctx.user.id);
      return { success: true };
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const [byCategory, byRisk] = await Promise.all([
      getIncidentStatsByUser(ctx.user.id),
      getIncidentRiskStatsByUser(ctx.user.id),
    ]);
    return {
      byCategory: byCategory.map((r) => ({ category: r.category, count: Number(r.count) })),
      byRisk: byRisk.map((r) => ({ riskLevel: r.riskLevel, count: Number(r.count) })),
    };
  }),

  globalStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores" });
    }
    return getGlobalStats();
  }),
});

// ─── App Router ────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  incidents: incidentsRouter,
});

export type AppRouter = typeof appRouter;
