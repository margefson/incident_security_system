import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB ──────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getUserByEmail: vi.fn(),
  createLocalUser: vi.fn(),
  upsertUser: vi.fn(),
  createIncident: vi.fn(),
  getIncidentsByUser: vi.fn(),
  getIncidentById: vi.fn(),
  deleteIncident: vi.fn(),
  getIncidentStatsByUser: vi.fn(),
  getIncidentRiskStatsByUser: vi.fn(),
  getGlobalStats: vi.fn(),
  getAllIncidents: vi.fn(),
  countAllIncidents: vi.fn(),
  reclassifyIncident: vi.fn(),
  getAllUsers: vi.fn(),
  updateUserRole: vi.fn(),
}));

import * as db from "./db";

// ─── Mock bcryptjs ────────────────────────────────────────────────────────────
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2b$12$hashedpassword"),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

// ─── Mock SDK ─────────────────────────────────────────────────────────────────
vi.mock("./_core/sdk", () => ({
  sdk: {
    createSessionToken: vi.fn().mockResolvedValue("mock-jwt-token"),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createPublicContext(): TrpcContext {
  const cookies: Record<string, string> = {};
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string) => { cookies[name] = value; },
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createAuthContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "local_user-1",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "local",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    isActive: true,
    passwordHash: "$2b$12$hashedpassword",
    ...overrides,
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Auth Tests ───────────────────────────────────────────────────────────────
describe("auth.register", () => {
  beforeEach(() => vi.clearAllMocks());

  it("registra novo usuário com sucesso", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(undefined);
    vi.mocked(db.createLocalUser).mockResolvedValue({
      id: 1, openId: "local_abc", name: "Test User", email: "test@example.com",
      passwordHash: "$2b$12$hash", loginMethod: "local", role: "user",
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), isActive: true,
    });

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.auth.register({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    });

    expect(result.success).toBe(true);
    expect(result.userId).toBe(1);
  });

  it("rejeita registro com email duplicado", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue({
      id: 1, openId: "existing", name: "Existing", email: "test@example.com",
      passwordHash: "$2b$12$hash", loginMethod: "local", role: "user",
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), isActive: true,
    });

    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.auth.register({ name: "Test", email: "test@example.com", password: "password123" })
    ).rejects.toThrow("Email já cadastrado");
  });

  it("rejeita senha muito curta", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.auth.register({ name: "Test", email: "test@example.com", password: "123" })
    ).rejects.toThrow();
  });
});

describe("auth.login", () => {
  beforeEach(() => vi.clearAllMocks());

  it("autentica usuário com credenciais válidas", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue({
      id: 1, openId: "local_abc", name: "Test User", email: "test@example.com",
      passwordHash: "$2b$12$hash", loginMethod: "local", role: "user",
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), isActive: true,
    });
    vi.mocked(db.upsertUser).mockResolvedValue(undefined);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.login({ email: "test@example.com", password: "password123" });

    expect(result.success).toBe(true);
  });

  it("rejeita credenciais inválidas", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.auth.login({ email: "wrong@example.com", password: "wrongpass" })
    ).rejects.toThrow("Credenciais inválidas");
  });
});

describe("auth.logout", () => {
  it("limpa o cookie de sessão e retorna sucesso", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(ctx.res.clearCookie).toHaveBeenCalledWith(
      COOKIE_NAME,
      expect.objectContaining({ maxAge: -1 })
    );
  });
});

// ─── Incidents Tests ──────────────────────────────────────────────────────────
describe("incidents.create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cria incidente com classificação automática", async () => {
    const mockIncident = {
      id: 1, userId: 1, title: "Phishing detectado", description: "E-mail suspeito com link para roubo de credenciais recebido por vários usuários.",
      category: "phishing" as const, riskLevel: "high" as const, confidence: 0.85,
      createdAt: new Date(), updatedAt: new Date(),
    };
    vi.mocked(db.createIncident).mockResolvedValue(mockIncident);

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.incidents.create({
      title: "Phishing detectado",
      description: "E-mail suspeito com link para roubo de credenciais recebido por vários usuários.",
    });

    expect(result?.id).toBe(1);
    expect(db.createIncident).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, title: "Phishing detectado" })
    );
  });

  it("rejeita incidente com título muito curto", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.incidents.create({ title: "AB", description: "Descrição longa o suficiente para passar na validação." })
    ).rejects.toThrow();
  });

  it("rejeita incidente com descrição muito curta", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.incidents.create({ title: "Título válido", description: "Curta" })
    ).rejects.toThrow();
  });

  it("requer autenticação para criar incidente", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.incidents.create({ title: "Título válido", description: "Descrição longa o suficiente para passar." })
    ).rejects.toThrow();
  });
});

describe("incidents.list", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna apenas incidentes do usuário autenticado", async () => {
    const userIncidents = [
      { id: 1, userId: 1, title: "Inc 1", description: "Desc 1", category: "phishing" as const, riskLevel: "high" as const, confidence: 0.9, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, userId: 1, title: "Inc 2", description: "Desc 2", category: "malware" as const, riskLevel: "critical" as const, confidence: 0.8, createdAt: new Date(), updatedAt: new Date() },
    ];
    vi.mocked(db.getIncidentsByUser).mockResolvedValue(userIncidents);

    const caller = appRouter.createCaller(createAuthContext({ id: 1 }));
    const result = await caller.incidents.list();

    expect(result).toHaveLength(2);
    expect(db.getIncidentsByUser).toHaveBeenCalledWith(1);
    // Verifica que todos os incidentes pertencem ao usuário 1
    result.forEach((inc) => expect(inc.userId).toBe(1));
  });
});

describe("incidents.getById - controle de acesso", () => {
  beforeEach(() => vi.clearAllMocks());

  it("permite acesso ao próprio incidente", async () => {
    const incident = {
      id: 1, userId: 1, title: "Meu incidente", description: "Desc",
      category: "phishing" as const, riskLevel: "high" as const, confidence: 0.9,
      createdAt: new Date(), updatedAt: new Date(),
    };
    vi.mocked(db.getIncidentById).mockResolvedValue(incident);

    const caller = appRouter.createCaller(createAuthContext({ id: 1 }));
    const result = await caller.incidents.getById({ id: 1 });
    expect(result.id).toBe(1);
  });

  it("bloqueia acesso a incidente de outro usuário", async () => {
    const incident = {
      id: 5, userId: 99, title: "Incidente de outro", description: "Desc",
      category: "malware" as const, riskLevel: "critical" as const, confidence: 0.95,
      createdAt: new Date(), updatedAt: new Date(),
    };
    vi.mocked(db.getIncidentById).mockResolvedValue(incident);

    const caller = appRouter.createCaller(createAuthContext({ id: 1, role: "user" }));
    await expect(caller.incidents.getById({ id: 5 })).rejects.toThrow("Acesso negado");
  });

  it("admin pode acessar qualquer incidente", async () => {
    const incident = {
      id: 5, userId: 99, title: "Incidente de outro", description: "Desc",
      category: "malware" as const, riskLevel: "critical" as const, confidence: 0.95,
      createdAt: new Date(), updatedAt: new Date(),
    };
    vi.mocked(db.getIncidentById).mockResolvedValue(incident);

    const caller = appRouter.createCaller(createAuthContext({ id: 1, role: "admin" }));
    const result = await caller.incidents.getById({ id: 5 });
    expect(result.id).toBe(5);
  });
});

describe("incidents.delete - controle de acesso", () => {
  beforeEach(() => vi.clearAllMocks());

  it("permite deletar próprio incidente", async () => {
    vi.mocked(db.getIncidentById).mockResolvedValue({
      id: 1, userId: 1, title: "Inc", description: "Desc",
      category: "phishing" as const, riskLevel: "high" as const, confidence: 0.8,
      createdAt: new Date(), updatedAt: new Date(),
    });
    vi.mocked(db.deleteIncident).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createAuthContext({ id: 1 }));
    const result = await caller.incidents.delete({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("bloqueia deletar incidente de outro usuário", async () => {
    vi.mocked(db.getIncidentById).mockResolvedValue({
      id: 2, userId: 99, title: "Inc", description: "Desc",
      category: "phishing" as const, riskLevel: "high" as const, confidence: 0.8,
      createdAt: new Date(), updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(createAuthContext({ id: 1, role: "user" }));
    await expect(caller.incidents.delete({ id: 2 })).rejects.toThrow("Acesso negado");
  });
});

describe("incidents.stats", () => {
  it("retorna estatísticas por categoria e risco do usuário", async () => {
    vi.mocked(db.getIncidentStatsByUser).mockResolvedValue([
      { category: "phishing" as const, count: 3 },
      { category: "malware" as const, count: 2 },
    ]);
    vi.mocked(db.getIncidentRiskStatsByUser).mockResolvedValue([
      { riskLevel: "high" as const, count: 3 },
      { riskLevel: "critical" as const, count: 2 },
    ]);

    const caller = appRouter.createCaller(createAuthContext({ id: 1 }));
    const result = await caller.incidents.stats();

    expect(result.byCategory).toHaveLength(2);
    expect(result.byRisk).toHaveLength(2);
    expect(result.byCategory[0]).toMatchObject({ category: "phishing", count: 3 });
  });
});

// ─── Admin Tests ──────────────────────────────────────────────────────────────
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// Mock fetch for ML and PDF services
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("admin.listIncidents", () => {
  beforeEach(() => vi.clearAllMocks());

  it("permite que admin liste todos os incidentes", async () => {
    const mockIncident = {
      id: 1, userId: 1, title: "Inc Admin", description: "Desc",
      category: "malware" as const, riskLevel: "critical" as const,
      confidence: 0.95, createdAt: new Date(), updatedAt: new Date(),
      userName: "Admin User", userEmail: "admin@example.com",
    };
    vi.mocked(db.getAllIncidents).mockResolvedValue([mockIncident]);
    vi.mocked(db.countAllIncidents).mockResolvedValue(1);

    const caller = appRouter.createCaller(createAuthContext({ id: 1, role: "admin" }));
    const result = await caller.admin.listIncidents({ page: 1, limit: 20 });

    expect(result.incidents).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.incidents[0].title).toBe("Inc Admin");
  });

  it("bloqueia acesso de usuário comum ao painel admin", async () => {
    const caller = appRouter.createCaller(createAuthContext({ id: 1, role: "user" }));
    await expect(caller.admin.listIncidents({ page: 1, limit: 20 })).rejects.toThrow();
  });
});

describe("admin.reclassify", () => {
  beforeEach(() => vi.clearAllMocks());

  it("permite que admin reclassifique incidente manualmente", async () => {
    const reclassified = {
      id: 5, userId: 2, title: "Inc", description: "Desc",
      category: "malware" as const, riskLevel: "critical" as const,
      confidence: 1.0, createdAt: new Date(), updatedAt: new Date(),
    };
    vi.mocked(db.reclassifyIncident).mockResolvedValue(reclassified);

    const caller = appRouter.createCaller(createAuthContext({ id: 1, role: "admin" }));
    const result = await caller.admin.reclassify({
      id: 5,
      category: "malware",
      riskLevel: "critical",
    });

    expect(result.category).toBe("malware");
    expect(result.riskLevel).toBe("critical");
  });

  it("bloqueia reclassificação por usuário comum", async () => {
    const caller = appRouter.createCaller(createAuthContext({ id: 1, role: "user" }));
    await expect(
      caller.admin.reclassify({ id: 5, category: "malware", riskLevel: "critical" })
    ).rejects.toThrow();
  });
});

describe("admin.stats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna estatísticas globais para admin", async () => {
    vi.mocked(db.getGlobalStats).mockResolvedValue({
      totalIncidents: 42,
      totalUsers: 8,
      byCategory: [{ category: "phishing" as const, count: 15 }],
      byRisk: [{ riskLevel: "high" as const, count: 20 }],
      topUsers: [{ userId: 1, userName: "Admin", count: 10 }],
    });

    const caller = appRouter.createCaller(createAuthContext({ id: 1, role: "admin" }));
    const result = await caller.admin.stats();

    expect(result.totalIncidents).toBe(42);
    expect(result.totalUsers).toBe(8);
    expect(result.byCategory[0]).toMatchObject({ category: "phishing", count: 15 });
  });
});

describe("admin.updateUserRole", () => {
  beforeEach(() => vi.clearAllMocks());

  it("permite que admin promova usuário para admin", async () => {
    vi.mocked(db.updateUserRole).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createAuthContext({ id: 1, role: "admin" }));
    const result = await caller.admin.updateUserRole({ userId: 2, role: "admin" });

    expect(result.success).toBe(true);
  });

  it("bloqueia atualização de role por usuário comum", async () => {
    const caller = appRouter.createCaller(createAuthContext({ id: 1, role: "user" }));
    await expect(
      caller.admin.updateUserRole({ userId: 2, role: "admin" })
    ).rejects.toThrow();
  });
});

describe("reports.exportPdf", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exporta PDF com incidentes do usuário autenticado", async () => {
    vi.mocked(db.getIncidentsByUser).mockResolvedValue([
      {
        id: 1, userId: 1, title: "Phishing Detectado", description: "Email suspeito",
        category: "phishing" as const, riskLevel: "high" as const,
        confidence: 0.9, createdAt: new Date(), updatedAt: new Date(),
      },
    ]);

    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => Buffer.from("PDF_CONTENT").buffer,
    });

    const caller = appRouter.createCaller(createAuthContext({ id: 1, name: "Test User", email: "test@example.com" }));
    const result = await caller.reports.exportPdf({});

    expect(result.incidentCount).toBe(1);
    expect(result.mimeType).toBe("application/pdf");
    expect(result.base64).toBeDefined();
    expect(result.filename).toContain(".pdf");
  });

  it("requer autenticação para exportar PDF", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.reports.exportPdf({})).rejects.toThrow();
  });
});

describe("incidents.create - notificação de risco crítico", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cria incidente crítico e dispara notificação", async () => {
    // Mock ML service returning malware (critical risk)
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ category: "malware", confidence: 0.97 }),
    });

    vi.mocked(db.createIncident).mockResolvedValue({
      id: 10, userId: 1, title: "Malware Crítico", description: "Ransomware detectado no servidor",
      category: "malware" as const, riskLevel: "critical" as const,
      confidence: 0.97, createdAt: new Date(), updatedAt: new Date(),
    });

    const { notifyOwner } = await import("./_core/notification");

    const caller = appRouter.createCaller(createAuthContext({ id: 1, name: "Test User", email: "test@example.com" }));
    const result = await caller.incidents.create({
      title: "Malware Crítico",
      description: "Ransomware detectado no servidor de produção com criptografia de arquivos",
    });

    expect(result.category).toBe("malware");
    expect(result.riskLevel).toBe("critical");
    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("CRÍTICO"),
      })
    );
  });
});
