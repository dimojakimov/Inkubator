import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertSessionSchema, insertDailyLogSchema } from "@shared/schema";
import { z } from "zod";

export function registerRoutes(httpServer: Server, app: Express) {
  // === SESSIONS ===
  app.get("/api/sessions", (_req, res) => {
    const data = storage.getSessions();
    res.json(data);
  });

  app.get("/api/sessions/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const session = storage.getSession(id);
    if (!session) return res.status(404).json({ error: "Не е пронајдена сесија" });
    res.json(session);
  });

  app.post("/api/sessions", (req, res) => {
    const parsed = insertSessionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const session = storage.createSession(parsed.data);
    // Generate milestone alerts for new session
    generateMilestoneAlerts(session.id, session.startDate);
    res.status(201).json(session);
  });

  app.patch("/api/sessions/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const parsed = insertSessionSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const updated = storage.updateSession(id, parsed.data);
    if (!updated) return res.status(404).json({ error: "Не е пронајдена сесија" });
    res.json(updated);
  });

  app.delete("/api/sessions/:id", (req, res) => {
    const id = parseInt(req.params.id);
    storage.deleteSession(id);
    res.json({ ok: true });
  });

  // === DAILY LOGS ===
  app.get("/api/sessions/:id/logs", (req, res) => {
    const sessionId = parseInt(req.params.id);
    const logs = storage.getDailyLogs(sessionId);
    res.json(logs);
  });

  app.post("/api/sessions/:id/logs", (req, res) => {
    const sessionId = parseInt(req.params.id);
    const parsed = insertDailyLogSchema.safeParse({ ...req.body, sessionId });
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const log = storage.upsertDailyLog(parsed.data);

    // Check temperature/humidity alerts
    const session = storage.getSession(sessionId);
    if (session && parsed.data.temperature !== undefined && parsed.data.temperature !== null) {
      const temp = parsed.data.temperature as number;
      if (temp < 37.0 || temp > 38.0) {
        storage.createAlert({
          sessionId,
          day: parsed.data.day,
          type: "temperature",
          message: temp < 37.0
            ? `Ден ${parsed.data.day}: Температурата е ${temp}°C — ПРЕНИСКА! Потребно е загревање.`
            : `Ден ${parsed.data.day}: Температурата е ${temp}°C — ПРЕВИСОКА! Намалете ја веднаш.`,
          dismissed: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
    if (session && parsed.data.humidity !== undefined && parsed.data.humidity !== null) {
      const hum = parsed.data.humidity as number;
      if (hum < 45 || hum > 80) {
        storage.createAlert({
          sessionId,
          day: parsed.data.day,
          type: "humidity",
          message: hum < 45
            ? `Ден ${parsed.data.day}: Влажноста е ${hum}% — ПРЕНИСКА! Додадете вода.`
            : `Ден ${parsed.data.day}: Влажноста е ${hum}% — ПРЕВИСОКА! Намалете ја.`,
          dismissed: false,
          createdAt: new Date().toISOString(),
        });
      }
    }

    res.json(log);
  });

  // === ALERTS ===
  app.get("/api/sessions/:id/alerts", (req, res) => {
    const sessionId = parseInt(req.params.id);
    const all = req.query.all === "true";
    const data = all ? storage.getAlerts(sessionId) : storage.getUndismissedAlerts(sessionId);
    res.json(data);
  });

  app.patch("/api/alerts/:id/dismiss", (req, res) => {
    const id = parseInt(req.params.id);
    storage.dismissAlert(id);
    res.json({ ok: true });
  });

  app.post("/api/sessions/:id/alerts/dismiss-all", (req, res) => {
    const sessionId = parseInt(req.params.id);
    storage.dismissAllAlerts(sessionId);
    res.json({ ok: true });
  });

  // Generate a turning reminder for today
  app.post("/api/sessions/:id/turning-reminder", (req, res) => {
    const sessionId = parseInt(req.params.id);
    const { day } = req.body;
    storage.createAlert({
      sessionId,
      day,
      type: "turning",
      message: `Ден ${day}: Не заборавајте да ги превртите јајцата! (3 пати дневно)`,
      dismissed: false,
      createdAt: new Date().toISOString(),
    });
    res.json({ ok: true });
  });
}

function generateMilestoneAlerts(sessionId: number, startDate: string) {
  const milestones = [
    { day: 7, message: "Ден 7: Кандлирање — проверете го развојот на ембрионот со светилка." },
    { day: 14, message: "Ден 14: Второ кандлирање — отстранете неоплодени јајца." },
    { day: 18, message: "Ден 18: ЗАКЛУЧУВАЊЕ! Запрете со превртување. Зголемете влажноста на 65-75%." },
    { day: 19, message: "Ден 19-21: Пилиците наскоро ќе се излупат! Не отворајте го инкубаторот." },
    { day: 21, message: "Ден 21: Ден на лупење! Дајте им 24-48h да се исушат пилиците." },
  ];
  const now = new Date().toISOString();
  for (const m of milestones) {
    storage.createAlert({
      sessionId,
      day: m.day,
      type: "milestone",
      message: m.message,
      dismissed: false,
      createdAt: now,
    });
  }
}
