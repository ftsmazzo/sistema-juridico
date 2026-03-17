import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicacoes } from "@/lib/api";

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const EXIBIR_OPCOES = [
  { value: "pendentes" as const, label: "Pendentes (com prazo em aberto)" },
  { value: "todas" as const, label: "Todas" },
  { value: "arquivadas" as const, label: "Arquivadas (todos cumpridos)" },
];

export function Publicacoes() {
  const [exibir, setExibir] = useState<"pendentes" | "todas" | "arquivadas">("pendentes");
  const { data: list = [], isPending, isError } = useQuery({
    queryKey: ["publicacoes", exibir],
    queryFn: () => getPublicacoes(100, exibir),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Publicações
          </h2>
          <p className="text-muted-foreground">
            Publicações OAB (Recorte Digital) recebidas e processadas. Por padrão aparecem só as com prazo em aberto.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Exibir:</span>
            <select
              value={exibir}
              onChange={(e) => setExibir(e.target.value as "pendentes" | "todas" | "arquivadas")}
              className="rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {EXIBIR_OPCOES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
          <Link
            to="/publicacoes/testar-email"
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50"
          >
            Testar e-mail Recorte
          </Link>
          <Link
            to="/publicacoes/nova"
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Nova publicação
          </Link>
          </div>
        </div>
      </div>

      {isError && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-4 text-destructive">
          Erro ao carregar publicações. Tente novamente.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {isPending ? (
          <div className="flex min-h-[200px] items-center justify-center p-8 text-muted-foreground">
            Carregando…
          </div>
        ) : list.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-8 text-muted-foreground">
            <p>Nenhuma publicação encontrada.</p>
            <p className="text-sm">
              As publicações chegam pelo webhook (e-mail OAB) ou pela opção{" "}
              <Link to="/publicacoes/nova" className="text-primary underline">
                Nova publicação
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 font-medium text-foreground">
                    Processo / Tipo
                  </th>
                  <th className="hidden px-4 py-3 font-medium text-foreground md:table-cell">
                    Vara
                  </th>
                  <th className="px-4 py-3 font-medium text-foreground">
                    Data pub.
                  </th>
                  <th className="hidden px-4 py-3 font-medium text-foreground lg:table-cell" title="Apenas números dos nossos advogados cadastrados no sistema">
                    OAB(s)
                  </th>
                  <th className="px-4 py-3 font-medium text-foreground">
                    Data do e-mail
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border/60 transition-colors hover:bg-muted/20"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/publicacoes/${p.id}`}
                        className="block font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {p.numeroProcesso || "—"}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {p.tipoPublicacao || "—"}
                      </div>
                    </td>
                    <td className="hidden max-w-[180px] truncate px-4 py-3 text-muted-foreground md:table-cell">
                      {p.vara || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {p.dataPublicacao || "—"}
                    </td>
                    <td className="hidden max-w-[220px] truncate px-4 py-3 text-muted-foreground lg:table-cell">
                      {p.oabs || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {p.dateEmail ? formatarData(p.dateEmail) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
