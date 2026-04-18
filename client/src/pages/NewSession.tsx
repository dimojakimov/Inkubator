import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useHashLocation } from "wouter/use-hash-location";
import { z } from "zod";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Session } from "@shared/schema";

const formSchema = z.object({
  name: z.string().min(2, "Внесете барем 2 знаци").max(60, "Максимум 60 знаци"),
  startDate: z.string().min(1, "Изберете датум"),
  eggCount: z.coerce.number().int().min(1, "Минимум 1 јајце").max(200, "Максимум 200 јајца"),
  notes: z.string().max(500).optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function NewSession() {
  const [, navigate] = useHashLocation();
  const { toast } = useToast();

  const today = new Date().toISOString().split("T")[0];

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      startDate: today,
      eggCount: 12,
      notes: "",
    },
  });

  const createSession = useMutation({
    mutationFn: (data: FormData) =>
      apiRequest("POST", "/api/sessions", {
        ...data,
        isActive: true,
      }).then(r => r.json()) as Promise<Session>,
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Сесијата е креирана!", description: `${session.name} - Ден 1 / 21` });
      navigate(`/session/${session.id}`);
    },
    onError: () => {
      toast({ title: "Грешка", description: "Неуспешно креирање на сесија", variant: "destructive" });
    },
  });

  return (
    <Layout title="Нова инкубација" backTo="/">
      <div className="max-w-lg mx-auto">
        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-2xl">🥚</span>
              Поставете нова инкубациска сесија
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((d) => createSession.mutate(d))}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Назив на сесијата</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="пр. Пролетна инкубација 2026"
                          {...field}
                          data-testid="input-session-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Датум на поставување на јајца</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          data-testid="input-start-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="eggCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Број на јајца</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={200}
                          {...field}
                          data-testid="input-egg-count"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Белешки (опционално)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Пасмина, извор на јајца, посебни напомени..."
                          rows={3}
                          {...field}
                          data-testid="input-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Info box */}
                <div className="bg-primary/8 rounded-lg p-3 border border-primary/20 text-xs text-muted-foreground space-y-1">
                  <div className="font-semibold text-primary text-sm mb-1">Стандардни поставки за кокошки јајца:</div>
                  <div>🌡 Температура: <strong>37.5°C</strong> (опсег: 37.0–38.0°C)</div>
                  <div>💧 Влажност: <strong>50–60%</strong> (ден 1–18), <strong>65–75%</strong> (ден 18–21)</div>
                  <div>🔄 Превртување: <strong>3 пати дневно</strong> (ден 1–18)</div>
                  <div>🔒 Заклучување на <strong>ден 18</strong> — запрете со превртување</div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate("/")}
                    data-testid="btn-cancel"
                  >
                    Откажи
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createSession.isPending}
                    data-testid="btn-submit-session"
                  >
                    {createSession.isPending ? "Се зачувува..." : "Започни инкубација"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
