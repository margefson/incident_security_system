import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { users, incidents, InsertUser, InsertIncident } from "../drizzle/schema";
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
