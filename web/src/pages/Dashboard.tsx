import { useQuery } from "@tanstack/react-query";
import { healthCheck } from "@/lib/api";

export function Dashboard() {
  const { data: health, isPending, isError } = useQuery({
    queryKey: ["health"],
    queryFn: healthCheck,
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h2>
        <p className="text-muted-foreground">
          Visão geral de prazos, audiências e publicações.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">
            Status da API
          </h3>
          {isPending && (
            <p className="mt-2 text-lg font-medium text-muted-foreground">
              Verificando…
            </p>
          )}
          {isError && (
            <p className="mt-2 text-lg font-medium text-destructive">
              API indisponível
            </p>
          )}
          {health && (
            <p className="mt-2 text-lg font-medium text-primary">
              {health.service} — OK
            </p>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">
            Prazos hoje
          </h3>
          <p className="mt-2 text-lg font-medium text-foreground">—</p>
          <p className="text-xs text-muted-foreground">
            Endpoint em construção
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">
            Audiências esta semana
          </h3>
          <p className="mt-2 text-lg font-medium text-foreground">—</p>
          <p className="text-xs text-muted-foreground">
            Endpoint em construção
          </p>
        </div>
      </div>
    </div>
  );
}
