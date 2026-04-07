import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
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
  listCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
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

// ─── Mock notification ────────────────────────────────────────────────────────
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
const mockAdminUser = {
  id: 1,
  openId: "admin-open-id",
  name: "Admin User",
  email: "admin@test.com",
  passwordHash: null,
  loginMethod: "local",
  role: "admin" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
  isActive: true,
};

const mockRegularUser = {
  ...mockAdminUser,
  id: 2,
  openId: "user-open-id",
  email: "user@test.com",
  role: "user" as const,
};

function makeAdminCtx(): TrpcContext {
  return {
    user: mockAdminUser,
    req: {} as never,
    res: {} as never,
  };
}

function makeUserCtx(): TrpcContext {
  return {
    user: mockRegularUser,
    req: {} as never,
    res: {} as never,
  };
}

function makeAnonCtx(): TrpcContext {
  return {
    user: null,
    req: {} as never,
    res: {} as never,
  };
}

const mockCategory = {
  id: 1,
  name: "Phishing",
  description: "Ataques de phishing via e-mail",
  color: "#f87171",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("Categories CRUD", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── LIST ─────────────────────────────────────────────────────────────────
  describe("categories.list", () => {
    it("deve retornar lista de categorias para usuário não autenticado (público)", async () => {
      vi.mocked(db.listCategories).mockResolvedValue([mockCategory]);

      const caller = appRouter.createCaller(makeAnonCtx());
      const result = await caller.categories.list();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Phishing");
      expect(db.listCategories).toHaveBeenCalledOnce();
    });

    it("deve retornar lista vazia quando não há categorias", async () => {
      vi.mocked(db.listCategories).mockResolvedValue([]);

      const caller = appRouter.createCaller(makeAnonCtx());
      const result = await caller.categories.list();

      expect(result).toHaveLength(0);
    });

    it("deve retornar lista de categorias para usuário autenticado", async () => {
      vi.mocked(db.listCategories).mockResolvedValue([mockCategory, { ...mockCategory, id: 2, name: "Malware" }]);

      const caller = appRouter.createCaller(makeUserCtx());
      const result = await caller.categories.list();

      expect(result).toHaveLength(2);
    });
  });

  // ─── CREATE ───────────────────────────────────────────────────────────────
  describe("categories.create", () => {
    it("deve criar categoria quando admin", async () => {
      vi.mocked(db.createCategory).mockResolvedValue(mockCategory);

      const caller = appRouter.createCaller(makeAdminCtx());
      const result = await caller.categories.create({
        name: "Phishing",
        description: "Ataques de phishing",
        color: "#f87171",
      });

      expect(result?.name).toBe("Phishing");
      expect(db.createCategory).toHaveBeenCalledWith("Phishing", "Ataques de phishing", "#f87171");
    });

    it("deve criar categoria sem descrição e cor opcionais", async () => {
      vi.mocked(db.createCategory).mockResolvedValue({ ...mockCategory, name: "Ransomware", description: null, color: "#22d3ee" });

      const caller = appRouter.createCaller(makeAdminCtx());
      const result = await caller.categories.create({ name: "Ransomware" });

      expect(result?.name).toBe("Ransomware");
      expect(db.createCategory).toHaveBeenCalledWith("Ransomware", undefined, undefined);
    });

    it("deve rejeitar criação por usuário não-admin com FORBIDDEN", async () => {
      const caller = appRouter.createCaller(makeUserCtx());

      await expect(
        caller.categories.create({ name: "Test" })
      ).rejects.toThrow("FORBIDDEN");

      expect(db.createCategory).not.toHaveBeenCalled();
    });

    it("deve rejeitar criação por usuário não autenticado com UNAUTHORIZED", async () => {
      const caller = appRouter.createCaller(makeAnonCtx());

      await expect(
        caller.categories.create({ name: "Test" })
      ).rejects.toThrow();
    });

    it("deve rejeitar nome com menos de 2 caracteres", async () => {
      const caller = appRouter.createCaller(makeAdminCtx());

      await expect(
        caller.categories.create({ name: "A" })
      ).rejects.toThrow();

      expect(db.createCategory).not.toHaveBeenCalled();
    });

    it("deve rejeitar nome com mais de 100 caracteres", async () => {
      const caller = appRouter.createCaller(makeAdminCtx());
      const longName = "A".repeat(101);

      await expect(
        caller.categories.create({ name: longName })
      ).rejects.toThrow();

      expect(db.createCategory).not.toHaveBeenCalled();
    });
  });

  // ─── UPDATE ───────────────────────────────────────────────────────────────
  describe("categories.update", () => {
    it("deve atualizar categoria quando admin", async () => {
      const updated = { ...mockCategory, name: "Phishing Avançado" };
      vi.mocked(db.updateCategory).mockResolvedValue(updated);

      const caller = appRouter.createCaller(makeAdminCtx());
      const result = await caller.categories.update({
        id: 1,
        name: "Phishing Avançado",
      });

      expect(result?.name).toBe("Phishing Avançado");
      expect(db.updateCategory).toHaveBeenCalledWith(1, {
        name: "Phishing Avançado",
        description: undefined,
        color: undefined,
        isActive: undefined,
      });
    });

    it("deve atualizar apenas os campos fornecidos", async () => {
      const updated = { ...mockCategory, color: "#60a5fa" };
      vi.mocked(db.updateCategory).mockResolvedValue(updated);

      const caller = appRouter.createCaller(makeAdminCtx());
      const result = await caller.categories.update({ id: 1, color: "#60a5fa" });

      expect(result?.color).toBe("#60a5fa");
    });

    it("deve rejeitar atualização por usuário não-admin com FORBIDDEN", async () => {
      const caller = appRouter.createCaller(makeUserCtx());

      await expect(
        caller.categories.update({ id: 1, name: "Hacked" })
      ).rejects.toThrow("FORBIDDEN");

      expect(db.updateCategory).not.toHaveBeenCalled();
    });

    it("deve rejeitar atualização por usuário não autenticado com UNAUTHORIZED", async () => {
      const caller = appRouter.createCaller(makeAnonCtx());

      await expect(
        caller.categories.update({ id: 1, name: "Hacked" })
      ).rejects.toThrow();
    });

    it("deve permitir desativar categoria (isActive: false)", async () => {
      const deactivated = { ...mockCategory, isActive: false };
      vi.mocked(db.updateCategory).mockResolvedValue(deactivated);

      const caller = appRouter.createCaller(makeAdminCtx());
      const result = await caller.categories.update({ id: 1, isActive: false });

      expect(result?.isActive).toBe(false);
    });
  });

  // ─── DELETE ───────────────────────────────────────────────────────────────
  describe("categories.delete", () => {
    it("deve excluir (soft delete) categoria quando admin", async () => {
      vi.mocked(db.deleteCategory).mockResolvedValue({ success: true });

      const caller = appRouter.createCaller(makeAdminCtx());
      const result = await caller.categories.delete({ id: 1 });

      expect(result.success).toBe(true);
      expect(db.deleteCategory).toHaveBeenCalledWith(1);
    });

    it("deve rejeitar exclusão por usuário não-admin com FORBIDDEN", async () => {
      const caller = appRouter.createCaller(makeUserCtx());

      await expect(
        caller.categories.delete({ id: 1 })
      ).rejects.toThrow("FORBIDDEN");

      expect(db.deleteCategory).not.toHaveBeenCalled();
    });

    it("deve rejeitar exclusão por usuário não autenticado com UNAUTHORIZED", async () => {
      const caller = appRouter.createCaller(makeAnonCtx());

      await expect(
        caller.categories.delete({ id: 1 })
      ).rejects.toThrow();
    });
  });

  // ─── RBAC Summary ─────────────────────────────────────────────────────────
  describe("controle de acesso (RBAC)", () => {
    it("list: público (sem autenticação)", async () => {
      vi.mocked(db.listCategories).mockResolvedValue([]);
      const caller = appRouter.createCaller(makeAnonCtx());
      await expect(caller.categories.list()).resolves.toBeDefined();
    });

    it("create: apenas admin", async () => {
      const userCaller = appRouter.createCaller(makeUserCtx());
      await expect(userCaller.categories.create({ name: "Test" }))
        .rejects.toThrow("FORBIDDEN");
    });

    it("update: apenas admin", async () => {
      const userCaller = appRouter.createCaller(makeUserCtx());
      await expect(userCaller.categories.update({ id: 1, name: "Test" }))
        .rejects.toThrow("FORBIDDEN");
    });

    it("delete: apenas admin", async () => {
      const userCaller = appRouter.createCaller(makeUserCtx());
      await expect(userCaller.categories.delete({ id: 1 }))
        .rejects.toThrow("FORBIDDEN");
    });
  });
});
