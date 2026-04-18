import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, desc } from "drizzle-orm";
import { sessions, dailyLogs, alerts } from "@shared/schema";
import type { Session, InsertSession, DailyLog, InsertDailyLog, Alert, InsertAlert } from "@shared/schema";

const sqlite = new Database("incubator.db");
const db = drizzle(sqlite);

// Create tables if not exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    egg_count INTEGER NOT NULL DEFAULT 1,
    notes TEXT DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS daily_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    day INTEGER NOT NULL,
    temperature REAL,
    humidity REAL,
    turned INTEGER NOT NULL DEFAULT 0,
    notes TEXT DEFAULT '',
    logged_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    day INTEGER NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    dismissed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
`);

export interface IStorage {
  // Sessions
  getSessions(): Session[];
  getSession(id: number): Session | undefined;
  createSession(data: InsertSession): Session;
  updateSession(id: number, data: Partial<InsertSession>): Session | undefined;
  deleteSession(id: number): void;

  // Daily logs
  getDailyLogs(sessionId: number): DailyLog[];
  getDailyLog(sessionId: number, day: number): DailyLog | undefined;
  upsertDailyLog(data: InsertDailyLog): DailyLog;

  // Alerts
  getAlerts(sessionId: number): Alert[];
  getUndismissedAlerts(sessionId: number): Alert[];
  createAlert(data: InsertAlert): Alert;
  dismissAlert(id: number): void;
  dismissAllAlerts(sessionId: number): void;
}

export const storage: IStorage = {
  getSessions() {
    return db.select().from(sessions).orderBy(desc(sessions.id)).all();
  },
  getSession(id) {
    return db.select().from(sessions).where(eq(sessions.id, id)).get();
  },
  createSession(data) {
    return db.insert(sessions).values(data).returning().get();
  },
  updateSession(id, data) {
    return db.update(sessions).set(data).where(eq(sessions.id, id)).returning().get();
  },
  deleteSession(id) {
    db.delete(dailyLogs).where(eq(dailyLogs.sessionId, id)).run();
    db.delete(alerts).where(eq(alerts.sessionId, id)).run();
    db.delete(sessions).where(eq(sessions.id, id)).run();
  },

  getDailyLogs(sessionId) {
    return db.select().from(dailyLogs).where(eq(dailyLogs.sessionId, sessionId)).all();
  },
  getDailyLog(sessionId, day) {
    return db.select().from(dailyLogs).where(and(eq(dailyLogs.sessionId, sessionId), eq(dailyLogs.day, day))).get();
  },
  upsertDailyLog(data) {
    const existing = db.select().from(dailyLogs)
      .where(and(eq(dailyLogs.sessionId, data.sessionId), eq(dailyLogs.day, data.day))).get();
    if (existing) {
      return db.update(dailyLogs).set(data).where(eq(dailyLogs.id, existing.id)).returning().get();
    }
    return db.insert(dailyLogs).values(data).returning().get();
  },

  getAlerts(sessionId) {
    return db.select().from(alerts).where(eq(alerts.sessionId, sessionId)).orderBy(desc(alerts.id)).all();
  },
  getUndismissedAlerts(sessionId) {
    return db.select().from(alerts)
      .where(and(eq(alerts.sessionId, sessionId), eq(alerts.dismissed, false)))
      .orderBy(desc(alerts.id)).all();
  },
  createAlert(data) {
    return db.insert(alerts).values(data).returning().get();
  },
  dismissAlert(id) {
    db.update(alerts).set({ dismissed: true }).where(eq(alerts.id, id)).run();
  },
  dismissAllAlerts(sessionId) {
    db.update(alerts).set({ dismissed: true }).where(eq(alerts.sessionId, sessionId)).run();
  },
};
