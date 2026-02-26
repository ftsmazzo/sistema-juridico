import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getDashboard } from "@/lib/api";

function formatarData(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function Dashboard() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
  });

  if (isError) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h2>
        <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-6 text-destructive">
          Não foi possível carregar os dados. Verifique se a API está disponível.
        </div>
      </div>
    );
  }

  const totais = data?.totais ?? {
    publicacoes: 0,
    prazos: 0,
    prazosPendentes: 0,
    processos: 0,
  };
  const proximosPrazos = data?.proximosPrazos ?? [];
  const sugestoesIa = data?.sugestoesIa ?? [];

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Visão geral
        </h2>
        <p className="mt-1 text-muted-foreground">
          Publicações OAB, prazos e observações da análise por IA.
        </p>
      </div>

      {/* Cards de totais — grid uniforme */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <p className="text-sm font-medium text-muted-foreground">
            Publicações
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
            {isPending ? "—" : totais.publicacoes}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <p className="text-sm font-medium text-muted-foreground">Prazos</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
            {isPending ? "—" : totais.prazos}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <p className="text-sm font-medium text-muted-foreground">
            Prazos pendentes
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
            {isPending ? "—" : totais.prazosPendentes}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <p className="text-sm font-medium text-muted-foreground">
            Processos
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
            {isPending ? "—" : totais.processos}
          </p>
        </div>
      </div>

      {/* Próximos prazos + Sugestões IA — duas colunas em desktop */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Próximos prazos */}
        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <h3 className="font-semibold text-foreground">Próximos prazos</h3>
            <p className="text-sm text-muted-foreground">
              Prazos pendentes por data de vencimento
            </p>
          </div>
          <div className="p-4">
            {isPending ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Carregando…
              </p>
            ) : proximosPrazos.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum prazo pendente no momento.
              </p>
            ) : (
              <ul className="space-y-3">
                {proximosPrazos.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {p.prazo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.numeroProcesso && (
                          <span className="mr-2">{p.numeroProcesso}</span>
                        )}
                        <span>{formatarData(p.data)}</span>
                        {p.tipo && (
                          <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px]">
                            {p.tipo}
                          </span>
                        )}
                      </p>
                    </div>
                    <Link
                      to="/prazos"
                      className="shrink-0 text-sm font-medium text-primary hover:underline"
                    >
                      Ver
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {!isPending && proximosPrazos.length > 0 && (
              <div className="mt-4 text-center">
                <Link
                  to="/prazos"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Ver todos os prazos →
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Sugestões / Observações da IA */}
        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <h3 className="font-semibold text-foreground">
              Sugestões da análise por IA
            </h3>
            <p className="text-sm text-muted-foreground">
              Recomendações e observações das publicações analisadas
            </p>
          </div>
          <div className="p-4">
            {isPending ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Carregando…
              </p>
            ) : sugestoesIa.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma sugestão ou observação no momento.
              </p>
            ) : (
              <ul className="space-y-4">
                {sugestoesIa.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-lg border border-border/60 bg-muted/20 p-4"
                  >
                    {s.numeroProcesso && (
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        Processo {s.numeroProcesso}
                      </p>
                    )}
                    {s.resumo && (
                      <p className="mb-2 text-sm text-foreground">{s.resumo}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {s.observacoesIa}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatarData(s.createdAt.slice(0, 10))}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
