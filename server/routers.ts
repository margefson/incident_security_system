import { TRPCError } from "@trpc/server";
import { generatePdfBuffer, type IncidentRow } from "./pdf";
import fs from "fs";
import path from "path";
import { z } from "zod/v4";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router, analystProcedure } from "./_core/trpc";
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
  updateIncidentStatus,
  updateIncidentNotes,
  getIncidentStatusStats,
  searchIncidents,
  addIncidentHistory,
  getIncidentHistory,
  updateUserInfo,
  deleteUserById,
  resetUserPassword,
  clearMustChangePassword,
  createPasswordResetToken,
  getPasswordResetToken,
  resetPasswordWithToken,
  createNotification,
  getNotificationsByUser,
  markNotificationRead,
  markAllNotificationsRead,
  countUnreadNotifications,
  getResolutionMetrics,
  getAllIncidentHistoryForExport,
} from "./db";
import { sendPasswordResetEmail } from "./email";
import crypto from "crypto";
import { registerSchema, loginSchema, createIncidentSchema, validateJoi } from "./validation";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { sdk } from "./_core/sdk";
import { notifyOwner } from "./_core/notification";

// ─── ML Metrics Fallback ─────────────────────────────────────────────────
const METRICS_JSON_PATH = path.resolve(process.cwd(), "ml", "metrics.json");

type MLMetrics = {
  method: string;
  categories: string[];
  training: {
    dataset: string;
    dataset_size: number;
    categories: string[];
    cv_accuracy_mean: number;
    cv_accuracy_std: number;
    train_accuracy: number;
    category_distribution: Record<string, number>;
  };
  evaluation: {
    dataset: string;
    dataset_size: number;
    eval_accuracy: number;
    category_distribution: Record<string, number>;
    per_category: Record<string, { precision: number; recall: number; f1_score: number; support: number }>;
    macro_avg: { precision: number; recall: number; f1_score: number };
    weighted_avg: { precision: number; recall: number; f1_score: number };
    confusion_matrix: { labels: string[]; matrix: number[][] };
    evaluated_at: string;
  } | null;
  last_updated?: string;
  last_evaluated?: string | null;
  dataset_size: number;
  cv_accuracy_mean: number;
  cv_accuracy_std: number;
  train_accuracy: number;
  category_distribution: Record<string, number>;
};

function readMetricsJson(): MLMetrics | null {
  try {
    const raw = fs.readFileSync(METRICS_JSON_PATH, "utf-8");
    return JSON.parse(raw) as MLMetrics;
  } catch {
    return null;
  }
}

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
): Promise<{ category: string; confidence: number; method: string }> {
  try {
    const response = await fetch("http://localhost:5001/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("ML service error");
    const data = (await response.json()) as { category: string; confidence: number };
    return { ...data, method: "ml" };
  } catch {
    // Fallback: keyword-based classification
    return fallbackClassify(title, description);
  }
}

function fallbackClassify(
  title: string,
  description: string
): { category: string; confidence: number; method: string } {
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
  if (!best || best[1] === 0) return { category: "unknown", confidence: 0, method: "keyword" };
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  return { category: best[0], confidence: Math.round((best[1] / total) * 100) / 100, method: "keyword" };
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
      return { success: true, mustChangePassword: user.mustChangePassword ?? false };
    }),
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
  // ─── Password Reset Flow ────────────────────────────────────────────────
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email(), origin: z.string() }))
    .mutation(async ({ input }) => {
      const user = await getUserByEmail(input.email);
      // Always return success to prevent email enumeration
      if (!user || !user.email) return { success: true, linkInBand: false };
      const token = crypto.randomBytes(48).toString("hex");
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await createPasswordResetToken(user.id, token, expiresAt);
      const resetUrl = `${input.origin}/reset-password?token=${token}`;
      const emailResult = await sendPasswordResetEmail({
        to: user.email,
        userName: user.name ?? "Usuário",
        resetUrl,
        expiresMinutes: 10,
      });
      // If email could not be delivered (e.g., free-tier domain restriction),
      // return the link in-band so the frontend can display it directly.
      if (emailResult.linkInBand) {
        return {
          success: true,
          linkInBand: true,
          resetUrl,
          deliveryNote: emailResult.deliveryNote,
        };
      }
      return { success: true, linkInBand: false };
    }),
  validateResetToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const record = await getPasswordResetToken(input.token);
      if (!record) return { valid: false, reason: "Token inválido" };
      if (record.usedAt) return { valid: false, reason: "Token já utilizado" };
      if (new Date() > record.expiresAt) return { valid: false, reason: "Token expirado" };
      return { valid: true };
    }),
  confirmPasswordReset: publicProcedure
    .input(z.object({ token: z.string(), newPassword: z.string().min(8) }))
    .mutation(async ({ input }) => {
      const record = await getPasswordResetToken(input.token);
      if (!record) throw new TRPCError({ code: "BAD_REQUEST", message: "Token inválido" });
      if (record.usedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Token já utilizado" });
      if (new Date() > record.expiresAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Token expirado. Solicite uma nova redefinição." });
      const hash = await bcrypt.hash(input.newPassword, 12);
      await resetPasswordWithToken(record.userId, hash, record.id);
      return { success: true };
    }),
  clearMustChangePassword: protectedProcedure
    .mutation(async ({ ctx }) => {
      await clearMustChangePassword(ctx.user.id);
      return { success: true };
    }),
  changePassword: protectedProcedure
    .input(z.object({ currentPassword: z.string(), newPassword: z.string().min(8) }))
    .mutation(async ({ input, ctx }) => {
      const user = await getUserByEmail(ctx.user.email ?? "");
      if (!user || !user.passwordHash) throw new TRPCError({ code: "BAD_REQUEST", message: "Usuário não possui senha local" });
      const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Senha atual incorreta" });
      const hash = await bcrypt.hash(input.newPassword, 12);
      await resetUserPassword(ctx.user.id, hash);
      // After voluntary change, clear mustChangePassword flag
      await clearMustChangePassword(ctx.user.id);
      return { success: true };
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
     // Recomendações contextualizadas por categoria (seção 7.5)
    const CATEGORY_RECOMMENDATIONS: Record<string, { title: string; description: string; priority: string; action: string }> = {
      malware: {
        title: "Isolamento de Sistemas Comprometidos",
        description: "Incidentes de malware detectados. Verifique e isole imediatamente os sistemas comprometidos para evitar a propação lateral.",
        priority: "critical",
        action: "Isolar sistema, executar varredura completa e restaurar a partir de backup limpo.",
      },
      vazamento_de_dados: {
        title: "Notificação ao DPO e Avaliação LGPD",
        description: "Vazamento de dados identificado. É obrigatório notificar o Encarregado de Dados (DPO) e avaliar as obrigações previstas na LGPD (Art. 48).",
        priority: "critical",
        action: "Notificar DPO em até 72h, registrar o incidente e avaliar notificação à ANPD e aos titulares afetados.",
      },
      phishing: {
        title: "Reforço de Treinamento de Conscientização",
        description: "Ataques de phishing registrados. Reforce o treinamento de conscientização dos colaboradores e implemente filtros de e-mail mais rigorosos.",
        priority: "high",
        action: "Realizar campanha de phishing simulado, atualizar treinamentos e habilitar MFA em todas as contas.",
      },
      brute_force: {
        title: "Bloqueio Automático após Falhas de Login",
        description: "Tentativas de força bruta detectadas. Implemente bloqueio automático de contas após múltiplas falhas consecutivas de autenticação.",
        priority: "high",
        action: "Configurar lockout após 5 tentativas, habilitar CAPTCHA e revisar política de senhas.",
      },
      ddos: {
        title: "Revisão de Rate Limiting e CDN",
        description: "Ataques DDoS identificados. Revise as configurações de rate limiting, WAF e CDN para mitigar o impacto de futuros ataques.",
        priority: "high",
        action: "Ativar proteção DDoS no CDN, revisar regras de rate limiting e configurar auto-scaling.",
      },
    };
    const recommendations = Object.entries(byCategory)
      .filter(([cat, count]) => count > 0 && CATEGORY_RECOMMENDATIONS[cat])
      .map(([cat, count]) => ({
        category: cat,
        count: count as number,
        ...CATEGORY_RECOMMENDATIONS[cat],
      }))
      .sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return (order[a.priority as keyof typeof order] ?? 9) - (order[b.priority as keyof typeof order] ?? 9);
      });
    return { byCategory, byRisk, total, thisWeek, recommendations };
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
      return { category: result.category, riskLevel, confidence: result.confidence, method: result.method };
    }),
  // ─── Status & Notes (sugestões de acompanhamento) ────────────────────────
  updateStatus: analystProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["open", "in_progress", "resolved"]),
      comment: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const incident = await getIncidentById(input.id);
      if (!incident) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Incidente não encontrado" });
      }
      const current = await getIncidentById(input.id);
      if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Incidente não encontrado" });
      await updateIncidentStatus(input.id, ctx.user.id, input.status, ctx.user.role === "admin" || ctx.user.role === "security-analyst");
      // Record history entry
      await addIncidentHistory({
        incidentId: input.id,
        userId: ctx.user.id,
        action: "status_changed",
        fromValue: current.status,
        toValue: input.status,
        comment: input.comment ?? null,
      });
      // Notify incident owner if changed by analyst or admin
      if (incident.userId !== ctx.user.id) {
        await createNotification({
          userId: incident.userId,
          type: "status_changed",
          title: "Status do incidente atualizado",
          message: `O analista ${ctx.user.name ?? ctx.user.email ?? "desconhecido"} alterou o status do incidente "${incident.title}" para "${input.status}".`,
          incidentId: input.id,
        });
      }
      return { success: true };
    }),
  updateNotes: protectedProcedure
    .input(z.object({
      id: z.number(),
      notes: z.string().max(5000),
    }))
    .mutation(async ({ input, ctx }) => {
      const incident = await getIncidentById(input.id);
      if (!incident || (incident.userId !== ctx.user.id && ctx.user.role !== "admin")) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Incidente não encontrado" });
      }
      const current = await getIncidentById(input.id);
      if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Incidente não encontrado" });
      await updateIncidentNotes(input.id, ctx.user.id, input.notes, ctx.user.role === "admin");
      // Record history entry
      await addIncidentHistory({
        incidentId: input.id,
        userId: ctx.user.id,
        action: "notes_updated",
        fromValue: current.notes ?? null,
        toValue: input.notes,
      });
      return { success: true };
    }),
  statusStats: protectedProcedure.query(async ({ ctx }) => {
    return getIncidentStatusStats(ctx.user.id);
  }),
  history: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      // Verify ownership or admin
      const inc = await getIncidentById(input.id);
      if (!inc) throw new TRPCError({ code: "NOT_FOUND", message: "Incidente não encontrado" });
      if (inc.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      return getIncidentHistory(input.id);
    }),
  search: protectedProcedure
    .input(z.object({
      query: z.string().min(1).max(200),
      category: z.string().optional(),
      riskLevel: z.string().optional(),
      adminMode: z.boolean().optional().default(false),
      limit: z.number().int().min(1).max(200).optional().default(50),
    }))
    .query(async ({ input, ctx }) => {
      const isAdmin = input.adminMode && ctx.user.role === "admin";
      return searchIncidents({
        query: input.query,
        userId: isAdmin ? undefined : ctx.user.id,
        category: input.category,
        riskLevel: input.riskLevel,
        limit: input.limit,
      });
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
    .mutation(async ({ input, ctx }) => {
      const updated = await reclassifyIncident(input.id, input.category, input.riskLevel);
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Incidente não encontrado" });
      // Create in-app notification for the incident owner
      try {
        const incident = await getIncidentById(input.id);
        if (incident && incident.userId !== ctx.user.id) {
          const categoryLabels: Record<string, string> = {
            phishing: "Phishing",
            malware: "Malware",
            brute_force: "Força Bruta",
            ddos: "DDoS",
            vazamento_de_dados: "Vazamento de Dados",
            unknown: "Desconhecido",
          };
          await createNotification({
            userId: incident.userId,
            type: "reclassification",
            title: "Incidente Reclassificado",
            message: `Seu incidente "${incident.title}" foi reclassificado para a categoria "${categoryLabels[input.category] ?? input.category}" com risco "${input.riskLevel}" pelo administrador.`,
            incidentId: input.id,
          });
        }
      } catch (e) {
        console.warn("[Notification] Failed to create reclassification notification:", e);
      }
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
      role: z.enum(["user", "security-analyst", "admin"]),
    }))
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode alterar seu próprio perfil" });
      }
      await updateUserRole(input.userId, input.role);
      return { success: true };
    }),

  // Edit user info
  updateUser: adminProcedure
    .input(z.object({
      userId: z.number(),
      name: z.string().min(1).max(100).optional(),
      email: z.string().email().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Use a página de perfil para editar seus próprios dados" });
      }
      await updateUserInfo(input.userId, { name: input.name, email: input.email });
      return { success: true };
    }),
  // Delete user
  deleteUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode excluir sua própria conta" });
      }
      await deleteUserById(input.userId);
      return { success: true };
    }),
  // Reset user password to default
  resetUserPassword: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Use a página de perfil para alterar sua própria senha" });
      }
      const DEFAULT_PASSWORD = "Security2026@";
      const hash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
      await resetUserPassword(input.userId, hash);
      return { success: true };
    }),
  // Global stats
  stats: adminProcedure.query(async () => {
    return getGlobalStats();
  }),
  // ─── ML Procedures ────────────────────────────────────────────
  getMLMetrics: adminProcedure.query(async () => {
    const ML_URL = process.env.ML_SERVICE_URL ?? "http://localhost:5001";
    try {
      const response = await fetch(`${ML_URL}/metrics`, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error("ML service error");
      return await response.json() as MLMetrics;
    } catch {
      // Fallback: read metrics.json from disk
      const cached = readMetricsJson();
      if (!cached) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Serviço ML indisponível e cache de métricas não encontrado" });
      return { ...cached, _source: "cache" } as MLMetrics & { _source?: string };
    }
  }),
  getDataset: adminProcedure.query(async () => {
    const ML_URL = process.env.ML_SERVICE_URL ?? "http://localhost:5001";
    try {
      const response = await fetch(`${ML_URL}/dataset`, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error("ML service error");
      return await response.json() as {
        role: string;
        filename: string;
        base64: string;
        total_samples: number;
        category_distribution: Record<string, number>;
        preview: Array<{ title: string; description: string; category: string }>;
      };
    } catch {
      // Fallback: return metadata from metrics.json (no base64)
      const cached = readMetricsJson();
      return {
        role: "training",
        filename: "incidentes_cybersecurity_2000.xlsx",
        base64: "",
        total_samples: cached?.training?.dataset_size ?? cached?.dataset_size ?? 2000,
        category_distribution: cached?.training?.category_distribution ?? cached?.category_distribution ?? {},
        preview: [],
        _source: "cache",
      };
    }
  }),
  getEvalDataset: adminProcedure.query(async () => {
    const ML_URL = process.env.ML_SERVICE_URL ?? "http://localhost:5001";
    try {
      const response = await fetch(`${ML_URL}/eval-dataset`, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error("ML service error");
      return await response.json() as {
        role: string;
        filename: string;
        base64: string;
        total_samples: number;
        category_distribution: Record<string, number>;
        preview: Array<{ title: string; description: string; category: string }>;
      };
    } catch {
      // Fallback: return metadata from metrics.json evaluation section
      const cached = readMetricsJson();
      return {
        role: "evaluation",
        filename: "incidentes_cybersecurity_100.xlsx",
        base64: "",
        total_samples: cached?.evaluation?.dataset_size ?? 100,
        category_distribution: cached?.evaluation?.category_distribution ?? {},
        preview: [],
        _source: "cache",
      };
    }
  }),
  evaluateModel: adminProcedure.mutation(async () => {
    const ML_URL = process.env.ML_SERVICE_URL ?? "http://localhost:5001";
    let response: Response;
    try {
      response = await fetch(`${ML_URL}/evaluate`, { method: "POST", signal: AbortSignal.timeout(30000) });
    } catch {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Serviço ML indisponível. Verifique se o servidor Flask está rodando na porta 5001." });
    }
    if (!response.ok) {
      const err = await response.json() as { error?: string };
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.error ?? "Evaluation failed" });
    }
    const data = await response.json() as {
      success: boolean;
      evaluation: {
        dataset: string;
        dataset_size: number;
        eval_accuracy: number;
        category_distribution: Record<string, number>;
        per_category: Record<string, { precision: number; recall: number; f1_score: number; support: number }>;
        macro_avg: { precision: number; recall: number; f1_score: number };
        weighted_avg: { precision: number; recall: number; f1_score: number };
        confusion_matrix: { labels: string[]; matrix: number[][] };
        evaluated_at: string;
      };
    };
    return data;
  }),
  retrainModel: adminProcedure
    .input(z.object({
      samples: z.array(z.object({
        title: z.string().optional(),
        description: z.string().min(1, "Descrição obrigatória"),
        category: z.string().min(1, "Categoria obrigatória"),
      })).optional().default([]),
      risk_map: z.record(z.string(), z.enum(["critical", "high", "medium", "low"])).optional(),
      includeAllIncidents: z.boolean().optional().default(false),
    }))
    .mutation(async ({ input }) => {
      const ML_URL = process.env.ML_SERVICE_URL ?? "http://localhost:5001";
      // If includeAllIncidents=true, fetch all incidents from DB and merge with new samples
      let allSamples = [...input.samples];
      if (input.includeAllIncidents) {
        const dbIncidents = await getAllIncidents({ limit: 5000 });
        const dbSamples = dbIncidents
          .filter((i) => i.description && i.category && i.category !== "unknown")
          .map((i) => ({
            title: (i.title as string) || undefined,
            description: i.description as string,
            category: i.category as string,
          }));
        allSamples = [...dbSamples, ...allSamples];
      }
      if (allSamples.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhuma amostra disponível para retreinamento. Cadastre incidentes ou adicione amostras manuais." });
      }
      let retrainResponse: Response;
      try {
        retrainResponse = await fetch(`${ML_URL}/retrain`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ samples: allSamples, risk_map: input.risk_map ?? {} }),
          signal: AbortSignal.timeout(120000), // 2 min timeout for retraining
        });
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Serviço ML indisponível. Verifique se o servidor Flask está rodando na porta 5001." });
      }
      if (!retrainResponse.ok) {
        const err = await retrainResponse.json() as { error?: string };
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.error ?? "Retrain failed" });
      }
      const response = retrainResponse;
      const data = await response.json() as {
        success: boolean;
        message: string;
        metrics: Record<string, unknown>;
      };
      // Após retreinamento via /retrain, recarregar o modelo no Flask
      // para refletir o novo model.pkl gerado pelo train_model.py
      try {
        await fetch(`${ML_URL}/reload-model`, { method: "POST" });
      } catch (_) {
        // Não crítico: o modelo já foi retreinado, apenas o cache em memória não foi atualizado
      }
      return data;
    }),

  // ─── Upload de Dataset de Treinamento ────────────────────────────────────────────────
  uploadTrainDataset: adminProcedure
    .input(z.object({
      fileBase64: z.string(), // arquivo .xlsx em base64
      filename: z.string(),
    }))
    .mutation(async ({ input }) => {
      const ML_URL = process.env.ML_SERVICE_URL ?? "http://localhost:5001";
      // Converter base64 para Buffer e enviar como multipart/form-data
      const fileBuffer = Buffer.from(input.fileBase64, "base64");
      const boundary = `----FormBoundary${Date.now()}`;
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${input.filename}"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`),
        fileBuffer,
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);
      try {
        const response = await fetch(`${ML_URL}/upload-train-dataset`, {
          method: "POST",
          headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
          body,
          signal: AbortSignal.timeout(30000),
        });
        if (!response.ok) {
          const err = await response.json() as { error?: string };
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.error ?? "Upload falhou" });
        }
        return await response.json() as { success: boolean; filename: string; total_samples: number; message: string };
      } catch (e) {
        if (e instanceof TRPCError) throw e;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Serviço ML indisponível. Verifique se o servidor Flask está rodando na porta 5001." });
      }
    }),

  // ─── Upload de Dataset de Avaliação ────────────────────────────────────────────────────
  uploadEvalDataset: adminProcedure
    .input(z.object({
      fileBase64: z.string(),
      filename: z.string(),
    }))
    .mutation(async ({ input }) => {
      const ML_URL = process.env.ML_SERVICE_URL ?? "http://localhost:5001";
      const fileBuffer = Buffer.from(input.fileBase64, "base64");
      const boundary = `----FormBoundary${Date.now()}`;
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${input.filename}"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`),
        fileBuffer,
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);
      try {
        const response = await fetch(`${ML_URL}/upload-eval-dataset`, {
          method: "POST",
          headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
          body,
          signal: AbortSignal.timeout(30000),
        });
        if (!response.ok) {
          const err = await response.json() as { error?: string };
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.error ?? "Upload falhou" });
        }
        return await response.json() as { success: boolean; filename: string; total_samples: number; message: string };
      } catch (e) {
        if (e instanceof TRPCError) throw e;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Serviço ML indisponível. Verifique se o servidor Flask está rodando na porta 5001." });
      }
    }),

  // ─── Dashboard de Saúde do Sistema ───────────────────────────────────────────────────
  getSystemHealth: adminProcedure.query(async () => {
    const ML_URL = process.env.ML_SERVICE_URL ?? "http://localhost:5001";
    const ML_URL2 = process.env.ML_SERVICE_URL2 ?? "http://localhost:5002";
    const checkService = async (url: string, name: string) => {
      try {
        const start = Date.now();
        const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3000) });
        const latency = Date.now() - start;
        if (res.ok) {
          const data = await res.json() as Record<string, unknown>;
          return { name, status: "online" as const, latency, details: data };
        }
        return { name, status: "degraded" as const, latency, details: null };
      } catch {
        return { name, status: "offline" as const, latency: null as number | null, details: null };
      }
    };
    const [primary, secondary] = await Promise.all([
      checkService(ML_URL, "Flask ML (porta 5001)"),
      checkService(ML_URL2, "Flask ML (porta 5002)"),
    ]);
    const metrics = readMetricsJson();
    return {
      services: [primary, secondary],
      metrics_cache: metrics ? { available: true, last_updated: metrics.last_updated as string } : { available: false, last_updated: null as string | null },
      checked_at: new Date().toISOString(),
    };
  }),
});
// ─── Reports Routerr ───────────────────────────────────────────────────────
const reportsRouter = router({
  exportPdf: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
      riskLevel: z.string().optional(),
      adminMode: z.boolean().optional().default(false),
      dateFrom: z.string().optional(), // ISO date string e.g. "2025-01-01"
      dateTo: z.string().optional(),   // ISO date string e.g. "2025-12-31"
    }))
    .mutation(async ({ input, ctx }) => {
      // Collect incidents
      let incidents: Array<Record<string, unknown>>;
      const dateFrom = input.dateFrom ? new Date(input.dateFrom).getTime() : undefined;
      const dateTo = input.dateTo ? new Date(input.dateTo + "T23:59:59").getTime() : undefined;
      if (input.adminMode && ctx.user.role === "admin") {
        incidents = await getAllIncidents({
          category: input.category,
          riskLevel: input.riskLevel,
          limit: 500,
          dateFrom,
          dateTo,
        });
      } else {
        const rows = await getIncidentsByUser(ctx.user.id);
        incidents = rows.filter((r) => {
          if (input.category && r.category !== input.category) return false;
          if (input.riskLevel && r.riskLevel !== input.riskLevel) return false;
          return true;
        });
      }

        // Try Python PDF service first, fall back to Node.js PDFKit
      const pdfPayload = {
        incidents: incidents as IncidentRow[],
        userName: ctx.user.name ?? "Usuário",
        userEmail: ctx.user.email ?? "",
        isAdmin: input.adminMode && ctx.user.role === "admin",
      };
      let pdfBuffer: Buffer;
      try {
        const response = await fetch("http://localhost:5002/generate-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pdfPayload),
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw new Error(`Flask PDF error: ${response.status}`);
        pdfBuffer = Buffer.from(await response.arrayBuffer());
      } catch {
        // Fallback: generate PDF with Node.js PDFKit (works without Python)
        console.log("[PDF] Flask unavailable, using Node.js PDFKit fallback");
        pdfBuffer = await generatePdfBuffer(pdfPayload);
      }
      const base64 = pdfBuffer.toString("base64");
      return {
        base64,
        filename: `relatorio_incidentes_${new Date().toISOString().slice(0, 10)}.pdf`,
        mimeType: "application/pdf",
        incidentCount: incidents.length,
      };
    }),
});
// ─── // ─── Notifications Router ─────────────────────────────────────────────────
const notificationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getNotificationsByUser(ctx.user.id);
  }),
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return countUnreadNotifications(ctx.user.id);
  }),
  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await markNotificationRead(input.id, ctx.user.id);
      return { success: true };
    }),
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await markAllNotificationsRead(ctx.user.id);
    return { success: true };
  }),
});

// ─── Analytics Router ─────────────────────────────────────────────────────
const analyticsRouter = router({
  resolutionMetrics: protectedProcedure.query(async () => {
    return getResolutionMetrics();
  }),
  exportHistoryCsv: protectedProcedure.query(async () => {
    const rows = await getAllIncidentHistoryForExport();
    if (!rows.length) return { csv: "", filename: "historico_incidentes.csv" };
    const headers = [
      "ID Histórico",
      "ID Incidente",
      "Título Incidente",
      "Categoria",
      "Status Atual",
      "Ação",
      "Valor Anterior",
      "Novo Valor",
      "Comentário",
      "Alterado Por",
      "E-mail",
      "Data/Hora",
    ];
    const escape = (v: unknown) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const csvRows = rows.map((r) => [
      r.historyId,
      r.incidentId,
      r.incidentTitle ?? "",
      r.incidentCategory ?? "",
      r.incidentStatus ?? "",
      r.action,
      r.fromValue ?? "",
      r.toValue ?? "",
      r.comment ?? "",
      r.changedBy ?? "",
      r.changedByEmail ?? "",
      r.changedAt ? new Date(r.changedAt).toISOString() : "",
    ].map(escape).join(","));
    const csv = [headers.join(","), ...csvRows].join("\n");
    return {
      csv,
      filename: `historico_incidentes_${new Date().toISOString().slice(0, 10)}.csv`,
    };
  }),
});

// ─── App Router ──────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  incidents: incidentsRouter,
  categories: categoriesRouter,
  admin: adminRouter,
  reports: reportsRouter,
  notifications: notificationsRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
