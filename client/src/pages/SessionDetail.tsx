import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ThermometerSun, Droplets, RotateCcw, Bell, BellOff,
  CheckCircle2, AlertTriangle, Info, X, ChevronDown, ChevronUp,
  Egg
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import GaugeMeter from "@/components/GaugeMeter";
import type { Session, DailyLog, Alert } from "@shared/schema";

function getDayNumber(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.min(Math.max(diff, 1), 21);
}

const DAY_NOTES: Record<number, string> = {
  1: "Поставете ги јајцата. Стабилизирајте ја температурата. Превртувајте 3× дневно.",
  3: "Почнува формирање на крвни садови.",
  7: "Кандлирање: Побарајте мрежа од крвни садови и темна тачка (ембрион).",
  10: "Ембрионот е добро видлив при кандлирање.",
  14: "Второ кандлирање: Јајцето треба да биде темно (полно). Отстранете светли.",
  18: "⚠ ЗАКЛУЧУВАЊЕ! Запрете со превртување. Зголемете влажноста на 65-75%.",
  19: "Пилиња почнуваат да 'пипкаат' во лупата.",
  20: "Можете да слушнете пискање! Не отварајте го инкубаторот.",
  21: "🐣 Ден на лупење! Процесот трае 12-24h. Не помагајте на пилињата.",
};

function getDayNote(day: number): string | undefined {
  return DAY_NOTES[day] || (day === 18 ? DAY_NOTES[18] : undefined);
}

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const sessionId = parseInt(id);
  const { toast } = useToast();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [logForm, setLogForm] = useState({ temperature: "37.5", humidity: "55", notes: "" });
  const [turningForm, setTurningForm] = useState({ times: "3" });

  const { data: session, isLoading: sessionLoading } = useQuery<Session>({
    queryKey: ["/api/sessions", sessionId],
    queryFn: () => apiRequest("GET", `/api/sessions/${sessionId}`).then(r => r.json()),
  });

  const { data: logs = [] } = useQuery<DailyLog[]>({
    queryKey: ["/api/sessions", sessionId, "logs"],
    queryFn: () => apiRequest("GET", `/api/sessions/${sessionId}/logs`).then(r => r.json()),
  });

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ["/api/sessions", sessionId, "alerts"],
    queryFn: () => apiRequest("GET", `/api/sessions/${sessionId}/alerts`).then(r => r.json()),
  });

  const savLog = useMutation({
    mutationFn: (data: { day: number; temperature?: number; humidity?: number; turned?: boolean; notes?: string }) =>
      apiRequest("POST", `/api/sessions/${sessionId}/logs`, {
        ...data,
        loggedAt: new Date().toISOString(),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "alerts"] });
      toast({ title: "Записот е зачуван" });
    },
  });

  const markTurned = useMutation({
    mutationFn: (day: number) =>
      apiRequest("POST", `/api/sessions/${sessionId}/logs`, {
        day,
        turned: true,
        loggedAt: new Date().toISOString(),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "logs"] });
      toast({ title: "Превртувањето е забележано ✓", description: "Добра работа!" });
    },
  });

  const dismissAlert = useMutation({
    mutationFn: (alertId: number) => apiRequest("PATCH", `/api/alerts/${alertId}/dismiss`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "alerts"] });
    },
  });

  const dismissAll = useMutation({
    mutationFn: () => apiRequest("POST", `/api/sessions/${sessionId}/alerts/dismiss-all`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "alerts"] });
      toast({ title: "Сите известувања се затворени" });
    },
  });

  if (sessionLoading) {
    return (
      <Layout backTo="/">
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout backTo="/" title="Грешка">
        <div className="text-center py-16 text-muted-foreground">Сесијата не е пронајдена.</div>
      </Layout>
    );
  }

  const currentDay = getDayNumber(session.startDate);
  const isLockdown = currentDay >= 18;
  const logsMap = new Map(logs.map(l => [l.day, l]));
  const todayLog = logsMap.get(currentDay);
  const undismissed = alerts.filter(a => !a.dismissed);
  const milestoneAlerts = undismissed.filter(a => a.type === "milestone" && a.day <= currentDay + 1);
  const urgentAlerts = undismissed.filter(a => a.type !== "milestone");

  const progress = Math.min((currentDay / 21) * 100, 100);

  // Latest readings from logs
  const sortedLogs = [...logs].sort((a, b) => b.day - a.day);
  const lastTempLog = sortedLogs.find(l => l.temperature !== null);
  const lastHumLog = sortedLogs.find(l => l.humidity !== null);

  return (
    <Layout title={session.name} backTo="/">
      <div className="space-y-4">

        {/* Urgent alerts */}
        {urgentAlerts.length > 0 && (
          <div className="space-y-2">
            {urgentAlerts.map(alert => (
              <AlertBanner key={alert.id} alert={alert} onDismiss={() => dismissAlert.mutate(alert.id)} />
            ))}
          </div>
        )}

        {/* Milestone alerts */}
        {milestoneAlerts.length > 0 && (
          <div className="space-y-2">
            {milestoneAlerts.map(alert => (
              <MilestoneBanner key={alert.id} alert={alert} onDismiss={() => dismissAlert.mutate(alert.id)} />
            ))}
          </div>
        )}

        {/* Progress header */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-2xl font-bold text-primary">Ден {currentDay}</div>
                <div className="text-xs text-muted-foreground">од 21 дена · {session.eggCount} јајца</div>
              </div>
              <div className="text-right">
                <div className="text-3xl">{currentDay >= 21 ? "🐣" : currentDay >= 18 ? "🔒" : "🥚"}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {currentDay >= 21 ? "Лупење!" : currentDay >= 18 ? "Заклучување" : `${21 - currentDay} дена уште`}
                </div>
              </div>
            </div>

            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary)/0.6))",
                  transition: "width 600ms ease",
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Ден 1</span>
              <span className="font-medium text-primary">{Math.round(progress)}% завршено</span>
              <span>Ден 21</span>
            </div>
          </CardContent>
        </Card>

        {/* Day note */}
        {getDayNote(currentDay) && (
          <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-200">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{getDayNote(currentDay)}</span>
          </div>
        )}

        <Tabs defaultValue="today">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today" data-testid="tab-today">Денес</TabsTrigger>
            <TabsTrigger value="calendar" data-testid="tab-calendar">Календар</TabsTrigger>
            <TabsTrigger value="alerts" data-testid="tab-alerts">
              Известувања
              {undismissed.length > 0 && (
                <span className="ml-1.5 bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5 leading-none">
                  {undismissed.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* TODAY TAB */}
          <TabsContent value="today" className="space-y-4 mt-4">
            {/* Gauges */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Последни мерења</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <GaugeMeter
                    value={lastTempLog?.temperature ?? 37.5}
                    min={35}
                    max={40}
                    target={37.5}
                    targetRange={[37.0, 38.0]}
                    unit="°C"
                    label="Температура"
                    colorOk="var(--color-temp-ok, #437A22)"
                    colorWarn="var(--color-temp-warn, #C55700)"
                  />
                  <GaugeMeter
                    value={lastHumLog?.humidity ?? 55}
                    min={30}
                    max={90}
                    target={62.5}
                    targetRange={isLockdown ? [65, 75] : [50, 75]}
                    unit="%"
                    label="Влажност"
                    colorOk="var(--color-humidity-ok, #006494)"
                    colorWarn="var(--color-humidity-warn, #C55700)"
                  />
                </div>
                {lastTempLog && (
                  <div className="text-xs text-muted-foreground text-center mt-2">
                    Последна мерка: Ден {lastTempLog.day}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Turning action */}
            {!isLockdown && (
              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm">Превртување на јајца</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Потребно 3 пати дневно, до ден 18
                      </div>
                    </div>
                    {todayLog?.turned ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-0 gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Превртено
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => markTurned.mutate(currentDay)}
                        disabled={markTurned.isPending}
                        className="gap-1.5"
                        data-testid="btn-mark-turned"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Забележи
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {isLockdown && (
              <div className="flex gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl text-sm text-orange-800 dark:text-orange-200">
                <span className="text-lg">🔒</span>
                <div>
                  <strong>Заклучување!</strong> Не превртувајте ги јајцата и не отварајте го инкубаторот. Зголемете влажноста на 65-75%.
                </div>
              </div>
            )}

            {/* Log form */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Внесете мерки за ден {currentDay}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <ThermometerSun className="h-3.5 w-3.5" /> Температура (°C)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={logForm.temperature}
                      onChange={e => setLogForm(f => ({ ...f, temperature: e.target.value }))}
                      placeholder="37.5"
                      data-testid="input-temperature"
                    />
                    <div className="text-xs text-muted-foreground">Цел: 37.5°C (37.0–38.0)</div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Droplets className="h-3.5 w-3.5" /> Влажност (%)
                    </label>
                    <Input
                      type="number"
                      step="1"
                      value={logForm.humidity}
                      onChange={e => setLogForm(f => ({ ...f, humidity: e.target.value }))}
                      placeholder={isLockdown ? "65-75" : "50-60"}
                      data-testid="input-humidity"
                    />
                    <div className="text-xs text-muted-foreground">
                      Цел: {isLockdown ? "65–75%" : "50–60%"}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Белешки</label>
                  <Textarea
                    rows={2}
                    value={logForm.notes}
                    onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Набљудувања, промени, кандлирање..."
                    data-testid="input-log-notes"
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={() => {
                    const temp = parseFloat(logForm.temperature);
                    const hum = parseFloat(logForm.humidity);
                    savLog.mutate({
                      day: currentDay,
                      temperature: isNaN(temp) ? undefined : temp,
                      humidity: isNaN(hum) ? undefined : hum,
                      notes: logForm.notes,
                    });
                  }}
                  disabled={savLog.isPending}
                  data-testid="btn-save-log"
                >
                  {savLog.isPending ? "Се зачувува..." : "Зачувај мерки"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CALENDAR TAB */}
          <TabsContent value="calendar" className="mt-4">
            <DayCalendar
              currentDay={currentDay}
              logsMap={logsMap}
              onSelectDay={setSelectedDay}
              selectedDay={selectedDay}
            />
            {selectedDay && (
              <DayDetail
                day={selectedDay}
                log={logsMap.get(selectedDay)}
                isLockdown={selectedDay >= 18}
                onClose={() => setSelectedDay(null)}
              />
            )}
          </TabsContent>

          {/* ALERTS TAB */}
          <TabsContent value="alerts" className="mt-4 space-y-3">
            {undismissed.length > 0 && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => dismissAll.mutate()}
                  disabled={dismissAll.isPending}
                  className="gap-1.5 text-xs"
                  data-testid="btn-dismiss-all"
                >
                  <BellOff className="h-3.5 w-3.5" />
                  Затвори сè
                </Button>
              </div>
            )}
            {undismissed.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Нема активни известувања
              </div>
            ) : (
              <div className="space-y-2">
                {undismissed.map(alert => (
                  <div
                    key={alert.id}
                    className={`alert-item flex items-start gap-3 p-3 rounded-xl border text-sm ${getAlertStyle(alert.type)}`}
                    data-testid={`alert-item-${alert.id}`}
                  >
                    <span className="text-base shrink-0">{getAlertIcon(alert.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{alert.message}</div>
                      <div className="text-xs opacity-70 mt-0.5">{getAlertTypeLabel(alert.type)}</div>
                    </div>
                    <button
                      onClick={() => dismissAlert.mutate(alert.id)}
                      className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                      data-testid={`btn-dismiss-alert-${alert.id}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function DayCalendar({
  currentDay,
  logsMap,
  onSelectDay,
  selectedDay,
}: {
  currentDay: number;
  logsMap: Map<number, DailyLog>;
  onSelectDay: (d: number) => void;
  selectedDay: number | null;
}) {
  const MILESTONES: Record<number, string> = {
    7: "🔍", 14: "🔍", 18: "🔒", 21: "🐣",
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground mb-1">Кликнете на ден за детали</div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 21 }, (_, i) => i + 1).map(day => {
          const log = logsMap.get(day);
          const isPast = day < currentDay;
          const isToday = day === currentDay;
          const isFuture = day > currentDay;
          const hasTurned = log?.turned;
          const hasReading = log?.temperature !== null && log?.temperature !== undefined;
          const milestone = MILESTONES[day];

          const tempOk = log?.temperature !== undefined && log.temperature !== null
            ? log.temperature >= 37.0 && log.temperature <= 38.0
            : true;
          const humOk = log?.humidity !== undefined && log.humidity !== null
            ? log.humidity >= 45 && log.humidity <= 80
            : true;
          const hasWarning = !tempOk || !humOk;

          return (
            <button
              key={day}
              onClick={() => onSelectDay(day)}
              data-testid={`day-cell-${day}`}
              className={`
                day-cell relative rounded-xl p-2 text-center border text-xs font-medium transition-all
                ${selectedDay === day ? "ring-2 ring-primary ring-offset-1" : ""}
                ${isToday ? "bg-primary text-primary-foreground border-primary font-bold" : ""}
                ${isPast && !isToday ? "bg-card border-border" : ""}
                ${isFuture ? "bg-muted/40 border-border/40 text-muted-foreground" : ""}
                ${hasWarning && !isFuture ? "border-orange-300 dark:border-orange-700" : ""}
              `}
            >
              <div className="text-sm">{day}</div>
              {milestone && <div className="text-base leading-none mt-0.5">{milestone}</div>}
              {!milestone && isPast && (
                <div className="text-base leading-none mt-0.5">
                  {hasWarning ? "⚠" : hasReading ? "✓" : hasTurned ? "↻" : "·"}
                </div>
              )}
              {!milestone && isToday && (
                <div className="text-base leading-none mt-0.5 animate-pulse">📍</div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>📍 Денес</span>
        <span>✓ Мерено</span>
        <span>↻ Превртено</span>
        <span>⚠ Предупредување</span>
        <span>🔍 Кандлирање</span>
        <span>🔒 Заклучување</span>
        <span>🐣 Лупење</span>
      </div>
    </div>
  );
}

function DayDetail({ day, log, isLockdown, onClose }: { day: number; log?: DailyLog; isLockdown: boolean; onClose: () => void }) {
  const note = DAY_NOTES[day];
  return (
    <Card className="mt-3 border-primary/30" data-testid={`day-detail-${day}`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Ден {day} — детали</CardTitle>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {note && (
          <div className="flex gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-800 dark:text-amber-200 text-xs">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{note}</span>
          </div>
        )}
        {log ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted rounded-lg p-2">
              <div className="text-xs text-muted-foreground">Температура</div>
              <div className={`text-base font-bold ${log.temperature && (log.temperature < 37 || log.temperature > 38) ? "text-orange-600" : "text-green-600"}`}>
                {log.temperature !== null ? `${log.temperature}°C` : "—"}
              </div>
            </div>
            <div className="bg-muted rounded-lg p-2">
              <div className="text-xs text-muted-foreground">Влажност</div>
              <div className={`text-base font-bold ${log.humidity && (log.humidity < 45 || log.humidity > 80) ? "text-orange-600" : "text-blue-600"}`}>
                {log.humidity !== null ? `${log.humidity}%` : "—"}
              </div>
            </div>
            <div className="bg-muted rounded-lg p-2">
              <div className="text-xs text-muted-foreground">Превртено</div>
              <div className="text-base font-bold">{log.turned ? "✓ Да" : "✗ Не"}</div>
            </div>
            {log.notes && (
              <div className="bg-muted rounded-lg p-2 col-span-2">
                <div className="text-xs text-muted-foreground">Белешки</div>
                <div className="text-xs mt-0.5">{log.notes}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-muted-foreground text-xs text-center py-3">Нема внесени мерки за овој ден.</div>
        )}
      </CardContent>
    </Card>
  );
}

function AlertBanner({ alert, onDismiss }: { alert: Alert; onDismiss: () => void }) {
  return (
    <div className={`alert-item flex items-start gap-3 p-3 rounded-xl border text-sm ${getAlertStyle(alert.type)}`}>
      <span className="text-base">{getAlertIcon(alert.type)}</span>
      <div className="flex-1 font-medium">{alert.message}</div>
      <button onClick={onDismiss} className="opacity-60 hover:opacity-100 shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function MilestoneBanner({ alert, onDismiss }: { alert: Alert; onDismiss: () => void }) {
  return (
    <div className="alert-item flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-900 dark:text-blue-100">
      <span className="text-base">📌</span>
      <div className="flex-1 font-medium">{alert.message}</div>
      <button onClick={onDismiss} className="opacity-60 hover:opacity-100 shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function getAlertStyle(type: string) {
  switch (type) {
    case "temperature": return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100";
    case "humidity": return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100";
    case "turning": return "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100";
    case "lockdown": return "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-100";
    default: return "bg-muted border-border text-foreground";
  }
}

function getAlertIcon(type: string) {
  switch (type) {
    case "temperature": return "🌡";
    case "humidity": return "💧";
    case "turning": return "🔄";
    case "lockdown": return "🔒";
    case "hatch": return "🐣";
    case "milestone": return "📌";
    default: return "🔔";
  }
}

function getAlertTypeLabel(type: string) {
  switch (type) {
    case "temperature": return "Предупредување за температура";
    case "humidity": return "Предупредување за влажност";
    case "turning": return "Потсетник за превртување";
    case "lockdown": return "Заклучување";
    case "hatch": return "Лупење";
    case "milestone": return "Прекретница";
    default: return "Известување";
  }
}
