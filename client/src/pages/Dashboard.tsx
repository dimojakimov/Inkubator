import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Egg, Calendar, Trash2, ChevronRight, CheckCircle2, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Session } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

function getDayNumber(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.min(Math.max(diff, 1), 21);
}

function getPhaseInfo(day: number) {
  if (day <= 7) return { label: "Рана фаза", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", icon: "🥚" };
  if (day <= 14) return { label: "Средна фаза", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: "🔍" };
  if (day <= 18) return { label: "Зрела фаза", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", icon: "⏳" };
  return { label: "Лупење!", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300", icon: "🐣" };
}

export default function Dashboard() {
  const [, navigate] = useHashLocation();
  const { toast } = useToast();

  const { data: sessions, isLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  const deleteSession = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/sessions/${id}`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Сесијата е избришана" });
    },
  });

  return (
    <Layout title="Инкубатор за јајца">
      <div className="space-y-6">
        {/* Hero stats banner */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Температура", value: "37.5°C", sub: "Идеална" },
            { label: "Влажност", value: "50–75%", sub: "Целен опсег" },
            { label: "Вкупно денови", value: "21", sub: "Инкубација" },
          ].map((s) => (
            <div key={s.label} className="bg-primary/10 rounded-xl p-3 text-center border border-primary/20">
              <div className="text-lg font-bold text-primary">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              <div className="text-xs text-primary/70 font-medium">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Sessions header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Активни инкубации</h2>
          <Link href="/session/new">
            <Button size="sm" className="gap-1.5" data-testid="btn-new-session">
              <Plus className="h-4 w-4" />
              Нова сесија
            </Button>
          </Link>
        </div>

        {/* Session list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : !sessions || sessions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const day = getDayNumber(session.startDate);
              const progress = Math.min((day / 21) * 100, 100);
              const phase = getPhaseInfo(day);
              const isComplete = day >= 21;

              return (
                <Card
                  key={session.id}
                  className="cursor-pointer hover:shadow-md transition-shadow border-border"
                  data-testid={`card-session-${session.id}`}
                  onClick={() => navigate(`/session/${session.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm text-foreground truncate">{session.name}</h3>
                          <Badge className={`text-xs ${phase.color} border-0`}>
                            {phase.icon} {phase.label}
                          </Badge>
                          {isComplete && (
                            <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-0">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Завршено
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Egg className="h-3.5 w-3.5" />
                            {session.eggCount} јајца
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(session.startDate).toLocaleDateString("mk-MK")}
                          </span>
                          <span className="flex items-center gap-1 font-semibold text-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            Ден {day} / 21
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-3">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${progress}%`,
                                background: isComplete
                                  ? "#437A22"
                                  : `linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary)/0.7))`,
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>Ден 1</span>
                            <span className="text-primary font-medium">{Math.round(progress)}%</span>
                            <span>Ден 21</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          data-testid={`btn-delete-${session.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Да се избрише оваа сесија?")) {
                              deleteSession.mutate(session.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Incubation guide */}
        <IncubationGuide />
      </div>
    </Layout>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
      <div className="text-5xl mb-4 egg-pulse">🥚</div>
      <h3 className="font-semibold text-foreground mb-2">Нема активни инкубации</h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
        Започнете нова сесија за инкубација и следете го развојот на вашите јајца.
      </p>
      <Link href="/session/new">
        <Button data-testid="btn-empty-new-session">
          <Plus className="h-4 w-4 mr-2" />
          Започни инкубација
        </Button>
      </Link>
    </div>
  );
}

function IncubationGuide() {
  const phases = [
    { days: "1–7", title: "Рана фаза", desc: "Стабилизирајте ги условите. Превртувајте 3× дневно. Не отварајте го инкубаторот непотребно.", icon: "🥚" },
    { days: "7–18", title: "Развој", desc: "Кандлирајте на ден 7 и 14. Отстранете неоплодени јајца. Одржувајте влажност 50-60%.", icon: "🔍" },
    { days: "18–19", title: "Заклучување", desc: "Запрете со превртување! Зголемете влажноста на 65-75%. Не отварајте го инкубаторот.", icon: "🔒" },
    { days: "19–21", title: "Лупење", desc: "Пилиците се лупат. Не им помагајте. Почекајте да се исушат целосно пред да ги преместите.", icon: "🐣" },
  ];

  return (
    <div>
      <h2 className="text-base font-semibold text-foreground mb-3">Водич за инкубација</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {phases.map((p) => (
          <div key={p.days} className="bg-card border border-border rounded-xl p-3 text-center">
            <div className="text-2xl mb-2">{p.icon}</div>
            <div className="text-xs font-bold text-primary mb-1">Ден {p.days}</div>
            <div className="text-xs font-semibold text-foreground mb-1">{p.title}</div>
            <div className="text-xs text-muted-foreground leading-relaxed">{p.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
