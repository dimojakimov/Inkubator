import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Incubation session table
export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(), // ISO date string YYYY-MM-DD
  eggCount: integer("egg_count").notNull().default(1),
  notes: text("notes").default(""),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

// Daily log entries
export const dailyLogs = sqliteTable("daily_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").notNull(),
  day: integer("day").notNull(), // 1-21
  temperature: real("temperature"), // in Celsius
  humidity: real("humidity"), // percentage 0-100
  turned: integer("turned", { mode: "boolean" }).notNull().default(false),
  notes: text("notes").default(""),
  loggedAt: text("logged_at").notNull(), // ISO datetime string
});

export const insertDailyLogSchema = createInsertSchema(dailyLogs).omit({ id: true });
export type InsertDailyLog = z.infer<typeof insertDailyLogSchema>;
export type DailyLog = typeof dailyLogs.$inferSelect;

// Alert/notification records
export const alerts = sqliteTable("alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").notNull(),
  day: integer("day").notNull(),
  type: text("type").notNull(), // 'turning' | 'temperature' | 'humidity' | 'milestone' | 'lockdown' | 'hatch'
  message: text("message").notNull(),
  dismissed: integer("dismissed", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});

export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;
