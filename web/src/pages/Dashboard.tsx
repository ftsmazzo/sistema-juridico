import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getDashboard } from "@/lib/api";
import { getUser } from "@/lib/auth";

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
  const agrupamento = data?.agrupamentoSemMovimentacao ?? {
    semInformacao: { totalProcessos: 0, totalPrazos: 0 },
    dias30: { totalProcessos: 0, totalPrazos: 0 },
    dias60: { totalProcessos: 0, totalPrazos: 0 },
    dias90: { totalProcessos: 0, totalPrazos: 0 },
    dias120Mais: { totalProcessos: 0, totalPrazos: 0 },
  };
  const linhasSemMov = [
    { key: "sem-info" as const, label: "Sem informação de movimentação", ...agrupamento.semInformacao },
    { key: "30" as const, label: "30 a 59 dias sem movimentação", ...agrupamento.dias30 },
    { key: "60" as const, label: "60 a 89 dias sem movimentação", ...agrupamento.dias60 },
    { key: "90" as const, label: "90 a 119 dias sem movimentação", ...agrupamento.dias90 },
    { key: "120-mais" as const, label: "120+ dias sem movimentação", ...agrupamento.dias120Mais },
  ];

  const user = getUser();
  const nomeUsuario = user?.pessoa
    ? `${user.pessoa.nome} ${user.pessoa.sobrenome}`
    : user?.login ?? "";

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Visão geral
        </h2>
        <p className="mt-1 text-muted-foreground">
          {nomeUsuario ? (
            <>
              Olá, <span className="font-medium text-foreground">{nomeUsuario}</span>.
              Aqui está sua visão de publicações OAB, prazos e processos.
            </>
          ) : (
            "Publicações OAB, prazos e processos."
          )}
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

        {/* Processos por tempo sem movimentação */}
        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <h3 className="font-semibold text-foreground">
              Processos por tempo sem movimentação
            </h3>
            <p className="text-sm text-muted-foreground">
              Agrupamento pela última movimentação (Escavador). Processos e prazos em cada faixa.
            </p>
          </div>
          <div className="overflow-x-auto p-4">
            {isPending ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Carregando…
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-2 font-medium text-foreground">Situação</th>
                    <th className="px-4 py-2 font-medium text-foreground text-right tabular-nums">Processos</th>
                    <th className="px-4 py-2 font-medium text-foreground text-right tabular-nums">Prazos</th>
                    <th className="px-4 py-2 font-medium text-foreground w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {linhasSemMov.map((linha) => (
                    <tr key={linha.key} className="border-b border-border/60 hover:bg-muted/20">
                      <td className="px-4 py-3 text-foreground">{linha.label}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{linha.totalProcessos}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{linha.totalPrazos}</td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/processos?semMovimentacao=${linha.key}`}
                          className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50"
                        >
                          Detalhes
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
