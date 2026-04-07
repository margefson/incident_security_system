import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { users, incidents, categories, InsertUser, InsertIncident, Incident } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ─────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod", "passwordHash"] as const;
    for (const field of textFields) {
      const value = user[field];
      if (value === undefined) continue;
      const normalized = value ?? null;
      (values as Record<string, unknown>)[field] = normalized;
      updateSet[field] = normalized;
    }
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0] ?? undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0] ?? undefined;
}

export async function createLocalUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  openId: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(users).values({
    openId: data.openId,
    name: data.name,
    email: data.email,
    passwordHash: data.passwordHash,
    loginMethod: "local",
    role: "user",
    lastSignedIn: new Date(),
    isActive: true,
  });
  const result = await db.select().from(users).where(eq(users.openId, data.openId)).limit(1);
  return result[0];
}

// ─── Incidents ─────────────────────────────────────────────────────────────

export async function createIncident(data: InsertIncident) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(incidents).values(data);
  const result = await db
    .select()
    .from(incidents)
    .where(and(eq(incidents.userId, data.userId!), eq(incidents.title, data.title)))
    .orderBy(desc(incidents.createdAt))
    .limit(1);
  return result[0];
}

export async function getIncidentsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(incidents)
    .where(eq(incidents.userId, userId))
    .orderBy(desc(incidents.createdAt));
}

export async function getIncidentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(incidents).where(eq(incidents.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function deleteIncident(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(incidents).where(and(eq(incidents.id, id), eq(incidents.userId, userId)));
}

export async function getIncidentStatsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      category: incidents.category,
      count: sql<number>`count(*)`,
    })
    .from(incidents)
    .where(eq(incidents.userId, userId))
    .groupBy(incidents.category);
}

export async function getIncidentRiskStatsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      riskLevel: incidents.riskLevel,
      count: sql<number>`count(*)`,
    })
    .from(incidents)
    .where(eq(incidents.userId, userId))
    .groupBy(incidents.riskLevel);
}

// ─── Admin Helpers ────────────────────────────────────────────────────────
export async function getAllIncidents(filters?: {
  category?: string;
  riskLevel?: string;
  userId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions: ReturnType<typeof eq>[] = [];
  if (filters?.category) conditions.push(eq(incidents.category, filters.category as Incident["category"]));
  if (filters?.riskLevel) conditions.push(eq(incidents.riskLevel, filters.riskLevel as Incident["riskLevel"]));
  if (filters?.userId) conditions.push(eq(incidents.userId, filters.userId));
  const query = db
    .select({
      id: incidents.id,
      userId: incidents.userId,
      title: incidents.title,
      description: incidents.description,
      category: incidents.category,
      riskLevel: incidents.riskLevel,
      confidence: incidents.confidence,
      createdAt: incidents.createdAt,
      updatedAt: incidents.updatedAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(incidents)
    .leftJoin(users, eq(incidents.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(incidents.createdAt))
    .limit(filters?.limit ?? 100)
    .offset(filters?.offset ?? 0);
  return query;
}

export async function countAllIncidents(filters?: {
  category?: string;
  riskLevel?: string;
  userId?: number;
}) {
  const db = await getDb();
  if (!db) return 0;
  const conditions: ReturnType<typeof eq>[] = [];
  if (filters?.category) conditions.push(eq(incidents.category, filters.category as Incident["category"]));
  if (filters?.riskLevel) conditions.push(eq(incidents.riskLevel, filters.riskLevel as Incident["riskLevel"]));
  if (filters?.userId) conditions.push(eq(incidents.userId, filters.userId));
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(incidents)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  return Number(result[0]?.count ?? 0);
}

export async function reclassifyIncident(id: number, category: Incident["category"], riskLevel: Incident["riskLevel"]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(incidents)
    .set({ category, riskLevel, confidence: 1.0 })
    .where(eq(incidents.id, id));
  const result = await db.select().from(incidents).where(eq(incidents.id, id)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    isActive: users.isActive,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
  }).from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ─── Categories CRUD ────────────────────────────────────────────────────────────
export async function listCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).where(eq(categories.isActive, true)).orderBy(categories.name);
}
export async function createCategory(name: string, description?: string, color?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(categories).values({ name, description: description ?? "", color: color ?? "#22d3ee" });
  const result = await db.select().from(categories).where(eq(categories.name, name)).limit(1);
  return result[0];
}
export async function updateCategory(id: number, data: { name?: string; description?: string; color?: string; isActive?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(categories).set({ ...data }).where(eq(categories.id, id));
  const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return result[0];
}
export async function deleteCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(categories).set({ isActive: false }).where(eq(categories.id, id));
  return { success: true };
}
export async function getGlobalStats() {
  const db = await getDb();
  if (!db) return { totalIncidents: 0, totalUsers: 0, byCategory: [], byRisk: [] };
  const [totalIncidents, totalUsers, byCategory, byRisk] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(incidents),
    db.select({ count: sql<number>`count(*)` }).from(users),
    db
      .select({ category: incidents.category, count: sql<number>`count(*)` })
      .from(incidents)
      .groupBy(incidents.category),
    db
      .select({ riskLevel: incidents.riskLevel, count: sql<number>`count(*)` })
      .from(incidents)
      .groupBy(incidents.riskLevel),
  ]);
  return {
    totalIncidents: Number(totalIncidents[0]?.count ?? 0),
    totalUsers: Number(totalUsers[0]?.count ?? 0),
    byCategory,
    byRisk,
  };
}

// ─── Status & Notes helpers ──────────────────────────────────────────────────

export async function updateIncidentStatus(
  id: number,
  userId: number,
  status: "open" | "in_progress" | "resolved",
  isAdmin: boolean = false
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const resolvedAt = status === "resolved" ? new Date() : null;
  const where = isAdmin ? eq(incidents.id, id) : and(eq(incidents.id, id), eq(incidents.userId, userId));
  await db
    .update(incidents)
    .set({ status, resolvedAt: resolvedAt ?? undefined, updatedAt: new Date() })
    .where(where!);
  return { success: true };
}

export async function updateIncidentNotes(
  id: number,
  userId: number,
  notes: string,
  isAdmin: boolean = false
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const where = isAdmin ? eq(incidents.id, id) : and(eq(incidents.id, id), eq(incidents.userId, userId));
  await db
    .update(incidents)
    .set({ notes, updatedAt: new Date() })
    .where(where!);
  return { success: true };
}

export async function getIncidentStatusStats(userId: number) {
  const db = await getDb();
  if (!db) return { open: 0, in_progress: 0, resolved: 0 };
  const rows = await db
    .select({ status: incidents.status, count: sql<number>`count(*)` })
    .from(incidents)
    .where(eq(incidents.userId, userId))
    .groupBy(incidents.status);
  const result = { open: 0, in_progress: 0, resolved: 0 };
  for (const row of rows) {
    result[row.status as keyof typeof result] = Number(row.count);
  }
  return result;
}
