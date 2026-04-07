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
  getAllIncidents,
  countAllIncidents,
  reclassifyIncident,
  getAllUsers,
  updateUserRole,
} from "./db";
import { registerSchema, loginSchema, createIncidentSchema, validateJoi } from "./validation";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { sdk } from "./_core/sdk";
import { notifyOwner } from "./_core/notification";

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
      // req. 6.8 (Timing Attack): always run bcrypt.compare regardless of whether
      // the user exists, so response time is identical for valid and invalid emails.
      // A dummy hash is used when the user is not found.
      const DUMMY_HASH = "$2b$12$invalidhashfortimingneutralizationXXXXXXXXXXXXXXXXXXX";
      const hashToCompare = user?.passwordHash ?? DUMMY_HASH;
      const valid = await bcrypt.compare(validated.password, hashToCompare);
      if (!user || !user.passwordHash || !valid) {
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

      // ⚠️ Notificar administrador em caso de risco crítico
      if (riskLevel === "critical") {
        notifyOwner({
          title: `⚠️ Incidente CRÍTICO registrado`,
          content: [
            `**Usuário:** ${ctx.user.name ?? ctx.user.email ?? ctx.user.openId}`,
            `**Título:** ${validated.title}`,
            `**Categoria:** ${category}`,
            `**Nível de Risco:** CRÍTICO`,
            `**Confiança do ML:** ${Math.round(confidence * 100)}%`,
            `**Data/Hora:** ${new Date().toLocaleString("pt-BR")}`,
          ].join("\n"),
        }).catch((err) =>
          console.warn("[Notification] Failed to notify owner:", err)
        );
      }

      return incident;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return getIncidentsByUser(ctx.user.id);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const incident = await getIncidentById(input.id);
      // req. 6.4 (IDOR): always return NOT_FOUND when incident doesn't belong to user
      // Never return FORBIDDEN — that would confirm the resource exists (IDOR leak)
      if (!incident || (incident.userId !== ctx.user.id && ctx.user.role !== "admin")) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Incidente não encontrado" });
      }
      return incident;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const incident = await getIncidentById(input.id);
      // req. 6.4 (IDOR): always return NOT_FOUND — never reveal resource existence
      if (!incident || (incident.userId !== ctx.user.id && ctx.user.role !== "admin")) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Incidente não encontrado" });
      }
      await deleteIncident(input.id, ctx.user.id);
      return { success: true };
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const [byCategoryRaw, byRiskRaw, allIncidents] = await Promise.all([
      getIncidentStatsByUser(ctx.user.id),
      getIncidentRiskStatsByUser(ctx.user.id),
      getIncidentsByUser(ctx.user.id),
    ]);
    const byCategory: Record<string, number> = {};
    for (const r of byCategoryRaw) byCategory[r.category] = Number(r.count);
    const byRisk: Record<string, number> = {};
    for (const r of byRiskRaw) byRisk[r.riskLevel] = Number(r.count);
    const total = allIncidents.length;
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = allIncidents.filter(i => new Date(i.createdAt).getTime() > oneWeekAgo).length;
    return { byCategory, byRisk, total, thisWeek };
  }),

  globalStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores" });
    }
    return getGlobalStats();
  }),
  classify: protectedProcedure
    .input(z.object({ description: z.string() }))
    .mutation(async ({ input }) => {
      const result = await classifyIncident("", input.description);
      const riskLevel = CATEGORY_RISK[result.category] ?? "medium";
      return { category: result.category, riskLevel, confidence: result.confidence };
    }),
});
// ─── Categories Router ────────────────────────────────────────────────────────────
const categoriesRouter = router({
  list: publicProcedure.query(async () => {
    const { listCategories } = await import("./db");
    return listCategories();
  }),
  create: protectedProcedure
    .input(z.object({ name: z.string().min(2).max(100), description: z.string().optional(), color: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { createCategory } = await import("./db");
      return createCategory(input.name, input.description, input.color);
    }),
  update: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().min(2).max(100).optional(), description: z.string().optional(), color: z.string().optional(), isActive: z.boolean().optional() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { updateCategory } = await import("./db");
      return updateCategory(input.id, { name: input.name, description: input.description, color: input.color, isActive: input.isActive });
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { deleteCategory } = await import("./db");
      return deleteCategory(input.id);
    }),
});
// ─── Admin Router ───────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores" });
  }
  return next({ ctx });
});

const adminRouter = router({
  // List all incidents with optional filters and pagination
  listIncidents: adminProcedure
    .input(z.object({
      category: z.string().optional(),
      riskLevel: z.string().optional(),
      userId: z.number().optional(),
      limit: z.number().min(1).max(500).default(100),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const [rows, total] = await Promise.all([
        getAllIncidents(input),
        countAllIncidents(input),
      ]);
      return { incidents: rows, total };
    }),

  // Reclassify an incident manually
  reclassify: adminProcedure
    .input(z.object({
      id: z.number(),
      category: z.enum(["phishing", "malware", "brute_force", "ddos", "vazamento_de_dados", "unknown"]),
      riskLevel: z.enum(["critical", "high", "medium", "low"]),
    }))
    .mutation(async ({ input }) => {
      const updated = await reclassifyIncident(input.id, input.category, input.riskLevel);
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Incidente não encontrado" });
      return updated;
    }),

  // List all users
  listUsers: adminProcedure.query(async () => {
    return getAllUsers();
  }),

  // Promote or demote a user
  updateUserRole: adminProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(["user", "admin"]),
    }))
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode alterar seu próprio perfil" });
      }
      await updateUserRole(input.userId, input.role);
      return { success: true };
    }),

  // Global stats
  stats: adminProcedure.query(async () => {
    return getGlobalStats();
  }),
});

// ─── Reports Router ───────────────────────────────────────────────────────
const reportsRouter = router({
  exportPdf: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
      riskLevel: z.string().optional(),
      adminMode: z.boolean().optional().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      // Collect incidents
      let incidents: Array<Record<string, unknown>>;
      if (input.adminMode && ctx.user.role === "admin") {
        incidents = await getAllIncidents({
          category: input.category,
          riskLevel: input.riskLevel,
          limit: 500,
        });
      } else {
        const rows = await getIncidentsByUser(ctx.user.id);
        incidents = rows.filter((r) => {
          if (input.category && r.category !== input.category) return false;
          if (input.riskLevel && r.riskLevel !== input.riskLevel) return false;
          return true;
        });
      }

      // Call Python PDF service
      const payload = {
        incidents,
        userName: ctx.user.name ?? "Usuário",
        userEmail: ctx.user.email ?? "",
        isAdmin: input.adminMode && ctx.user.role === "admin",
      };

      const response = await fetch("http://localhost:5002/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao gerar PDF",
        });
      }

      const pdfBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(pdfBuffer).toString("base64");
      return {
        base64,
        filename: `relatorio_incidentes_${new Date().toISOString().slice(0, 10)}.pdf`,
        mimeType: "application/pdf",
        incidentCount: incidents.length,
      };
    }),
});

// ─── App Router ────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  incidents: incidentsRouter,
  categories: categoriesRouter,
  admin: adminRouter,
  reports: reportsRouter,
});

export type AppRouter = typeof appRouter;
