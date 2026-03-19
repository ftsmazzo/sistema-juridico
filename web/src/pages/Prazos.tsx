import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPrazos, getLinkInscricaoCalendario, downloadPrazosIcs, type PrazoListItem } from "@/lib/api";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const TIPOS = [
  { value: "", label: "Todos os tipos" },
  { value: "civil", label: "Civil" },
  { value: "trabalhista", label: "Trabalhista" },
  { value: "administrativo", label: "Administrativo" },
];
const STATUS_OPCOES = [
  { value: "", label: "Todos" },
  { value: "0", label: "Pendentes" },
  { value: "1", label: "Cumpridos" },
];

/** Dias até o prazo (inclusive hoje) para exibir badge “Atenção / vencendo” */
const ATENCAO_DIAS = 7;

function addDaysISO(iso: string, dias: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + dias);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function formatarDataPrazo(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type BadgePrazo = "cumprido" | "vencido" | "atencao" | "prazo";

function badgeDoPrazo(p: PrazoListItem, hoje: string): BadgePrazo {
  if (p.status !== 0) return "cumprido";
  if (p.data < hoje) return "vencido";
  const limiteAtencao = addDaysISO(hoje, ATENCAO_DIAS);
  if (p.data <= limiteAtencao) return "atencao";
  return "prazo";
}

function labelBadge(b: BadgePrazo): { texto: string; className: string } {
  switch (b) {
    case "cumprido":
      return {
        texto: "Cumprido",
        className: "bg-muted text-muted-foreground",
      };
    case "vencido":
      return {
        texto: "Vencido / atrasado",
        className: "bg-red-600/15 text-red-800 dark:text-red-300",
      };
    case "atencao":
      return {
        texto: "Atenção / vencendo",
        className: "bg-amber-500/25 text-amber-900 dark:text-amber-200",
      };
    case "prazo":
      return {
        texto: "Dentro do prazo",
        className: "bg-emerald-600/15 text-emerald-800 dark:text-emerald-200",
      };
  }
}

function getInicioFimMes(ano: number, mes: number) {
  const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const fim = `${ano}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
  return { inicio, fim };
}

/** Retorna grade do mês: 6 linhas x 7 colunas; valor é YYYY-MM-DD ou null */
function gradeDoMes(ano: number, mes: number): (string | null)[][] {
  const primeiro = new Date(ano, mes - 1, 1);
  const ultimo = new Date(ano, mes, 0);
  const diaInicio = primeiro.getDay();
  const totalDias = ultimo.getDate();

  const dias: (string | null)[] = [];
  for (let i = 0; i < diaInicio; i++) dias.push(null);
  for (let d = 1; d <= totalDias; d++) {
    dias.push(`${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  const restante = 42 - dias.length;
  for (let i = 0; i < restante; i++) dias.push(null);

  const semanas: (string | null)[][] = [];
  for (let w = 0; w < 6; w++) semanas.push(dias.slice(w * 7, (w + 1) * 7));
  return semanas;
}

export function Prazos() {
  const [ref, setRef] = useState(() => {
    const d = new Date();
    return { ano: d.getFullYear(), mes: d.getMonth() + 1 };
  });
  const [status, setStatus] = useState<string>("");
  const [tipo, setTipo] = useState<string>("");
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [totalPrazos, setTotalPrazos] = useState<number | null>(null);
  const [exportando, setExportando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const { inicio, fim } = useMemo(
    () => getInicioFimMes(ref.ano, ref.mes),
    [ref.ano, ref.mes]
  );

  const { data: prazosList = [], isPending } = useQuery({
    queryKey: ["prazos", inicio, fim, status, tipo],
    queryFn: () =>
      getPrazos({
        inicio,
        fim,
        status: status === "" ? "" : Number(status),
        tipo: tipo || undefined,
      }),
  });

  const { data: listaTodos = [], isPending: listaPending } = useQuery({
    queryKey: ["prazos", "todos", status, tipo],
    queryFn: () =>
      getPrazos({
        status: status === "" ? "" : Number(status),
        tipo: tipo || undefined,
      }),
  });

  const listaOrdenada = useMemo(() => {
    const copy = [...listaTodos];
    const pendentes = copy.filter((p) => p.status === 0);
    const cumpridos = copy.filter((p) => p.status !== 0);
    pendentes.sort((a, b) => a.data.localeCompare(b.data));
    cumpridos.sort((a, b) => a.data.localeCompare(b.data));
    return [...pendentes, ...cumpridos];
  }, [listaTodos]);

  const prazosPorData = useMemo(() => {
    const map = new Map<string, PrazoListItem[]>();
    for (const p of prazosList) {
      const list = map.get(p.data) ?? [];
      list.push(p);
      map.set(p.data, list);
    }
    return map;
  }, [prazosList]);

  const grade = useMemo(() => gradeDoMes(ref.ano, ref.mes), [ref.ano, ref.mes]);

  const mesAnoLabel = useMemo(
    () =>
      new Date(ref.ano, ref.mes - 1, 1).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      }),
    [ref.ano, ref.mes]
  );

  const hoje = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const anterior = () => {
    if (ref.mes === 1) setRef({ ano: ref.ano - 1, mes: 12 });
    else setRef({ ano: ref.ano, mes: ref.mes - 1 });
  };
  const proximo = () => {
    if (ref.mes === 12) setRef({ ano: ref.ano + 1, mes: 1 });
    else setRef({ ano: ref.ano, mes: ref.mes + 1 });
  };

  const handleExportIcs = async () => {
    setExportando(true);
    try {
      await downloadPrazosIcs({ inicio, fim });
    } finally {
      setExportando(false);
    }
  };

  const handleObterLink = async () => {
    const data = await getLinkInscricaoCalendario();
    setLinkUrl(data.url);
    setTotalPrazos(data.totalPrazos ?? null);
  };

  const handleCopiarLink = () => {
    if (linkUrl) {
      navigator.clipboard.writeText(linkUrl);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Prazos
        </h2>
        <p className="text-muted-foreground">
          Calendário do mês selecionado e lista geral de prazos (respeitando os filtros abaixo).
        </p>
      </div>

      {/* Enviar para agenda */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 font-semibold text-foreground">Enviar para minha agenda</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Exporte seus prazos em .ics para importar no Google, Outlook ou iPhone. Ou use o link de
          inscrição para a agenda atualizar sozinha.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportIcs}
            disabled={exportando}
            className="rounded-lg border border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {exportando ? "Gerando…" : "Exportar .ics (download)"}
          </button>
          <button
            type="button"
            onClick={handleObterLink}
            className="rounded-lg border border-border bg-muted/50 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Obter link de inscrição
          </button>
          {linkUrl ? (
            <div className="flex w-full flex-1 basis-full flex-col gap-2">
              <div className="flex w-full items-center gap-2 md:flex-1">
                <input
                  type="text"
                  readOnly
                  value={linkUrl}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={handleCopiarLink}
                  className="shrink-0 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-medium hover:bg-muted"
                >
                  {copiado ? "Copiado!" : "Copiar"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                No Google Calendar: Outros calendários → Inscrever-se por URL. No Outlook: Adicionar
                calendário → Assinar da Web. Cole o link acima.
              </p>
              {typeof totalPrazos === "number" && (
                <p className="text-xs text-muted-foreground">
                  {totalPrazos === 0
                    ? "Você não tem prazos vinculados ao seu usuário (por OAB). O feed mostrará todos os prazos do sistema até haver vínculos."
                    : `Seu link contém ${totalPrazos} prazo(s) no momento.`}
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={anterior}
            className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            aria-label="Mês anterior"
          >
            ←
          </button>
          <span className="min-w-[180px] text-center font-medium capitalize text-foreground">
            {mesAnoLabel}
          </span>
          <button
            type="button"
            onClick={proximo}
            className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            aria-label="Próximo mês"
          >
            →
          </button>
        </div>
        <div className="h-6 w-px bg-border" />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {STATUS_OPCOES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {TIPOS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Calendário */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {/* Cabeçalho dias da semana */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/40">
          {DIAS_SEMANA.map((dia) => (
            <div
              key={dia}
              className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground md:text-sm"
            >
              {dia}
            </div>
          ))}
        </div>
        {/* Grades do mês */}
        {isPending ? (
          <div className="flex min-h-[320px] items-center justify-center p-8 text-muted-foreground">
            Carregando…
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {grade.flat().map((data, idx) => {
              const num = data ? data.slice(8, 10) : "";
              const ehHoje = data === hoje;
              const prazosDoDia = data ? prazosPorData.get(data) ?? [] : [];
              return (
                <div
                  key={idx}
                  className="min-h-[80px] border-b border-r border-border/60 p-1 last:border-r-0 md:min-h-[100px] md:p-2"
                >
                  <div
                    className={`text-right text-sm font-medium ${
                      data ? "text-foreground" : "text-muted-foreground/50"
                    } ${ehHoje ? "rounded-full bg-primary text-primary-foreground" : ""} ${data ? "inline-flex h-7 w-7 items-center justify-center" : ""}`}
                  >
                    {num || ""}
                  </div>
                  <ul className="mt-1 space-y-0.5 overflow-hidden">
                    {prazosDoDia.slice(0, 3).map((p) => (
                      <li key={p.id}>
                        <Link
                          to={`/prazos/${p.id}`}
                          className={`block truncate rounded px-1 py-0.5 text-xs hover:opacity-90 ${
                            p.status === 0
                              ? "bg-amber-500/20 text-amber-800 dark:text-amber-200"
                              : "bg-muted text-muted-foreground"
                          }`}
                          title={`${p.prazo}${p.numeroProcesso ? ` — ${p.numeroProcesso}` : ""} (clique para detalhes)`}
                        >
                          {p.prazo}
                        </Link>
                      </li>
                    ))}
                    {prazosDoDia.length > 3 && (
                      <li className="text-xs text-muted-foreground">
                        +{prazosDoDia.length - 3}
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lista completa (todos os prazos filtrados) */}
      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Todos os prazos</h3>
          <p className="text-sm text-muted-foreground">
            Ordem: pendentes do mais urgente (vencido ou mais próximo) ao mais distante; em seguida,
            cumpridos. Clique na linha para abrir o detalhe e baixar o prazo.
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {listaPending ? (
            <div className="flex min-h-[120px] items-center justify-center p-8 text-muted-foreground">
              Carregando lista…
            </div>
          ) : listaOrdenada.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum prazo com os filtros atuais.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-3 font-semibold text-foreground">Situação</th>
                    <th className="px-3 py-3 font-semibold text-foreground">Data do prazo</th>
                    <th className="px-3 py-3 font-semibold text-foreground">Publicação</th>
                    <th className="px-3 py-3 font-semibold text-foreground">Processo</th>
                    <th className="px-3 py-3 font-semibold text-foreground">Prazo</th>
                  </tr>
                </thead>
                <tbody>
                  {listaOrdenada.map((p) => {
                    const b = badgeDoPrazo(p, hoje);
                    const { texto, className } = labelBadge(b);
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-border/60 transition-colors hover:bg-muted/30"
                      >
                        <td className="px-3 py-2 align-middle">
                          <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${className}`}>
                            {texto}
                          </span>
                        </td>
                        <td className="px-3 py-2 align-middle text-foreground">
                          {formatarDataPrazo(p.data)}
                        </td>
                        <td className="max-w-[140px] truncate px-3 py-2 align-middle text-muted-foreground">
                          {p.dataPublicacao?.trim() ? p.dataPublicacao : "—"}
                        </td>
                        <td className="max-w-[160px] truncate px-3 py-2 align-middle font-mono text-xs text-foreground">
                          {p.numeroProcesso?.trim() ? p.numeroProcesso : "—"}
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <Link
                            to={`/prazos/${p.id}`}
                            className="font-medium text-primary hover:underline"
                            title="Abrir detalhe"
                          >
                            {p.prazo}
                          </Link>
                          <span className="ml-2 text-xs text-muted-foreground">({p.tipo})</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-muted-foreground">Calendário:</span>
          <span className="text-muted-foreground">
            mostra apenas o mês exibido acima.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium text-muted-foreground">Badges (lista):</span>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${labelBadge("vencido").className}`}>
            {labelBadge("vencido").texto}
          </span>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${labelBadge("atencao").className}`}>
            {labelBadge("atencao").texto}
          </span>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${labelBadge("prazo").className}`}>
            {labelBadge("prazo").texto}
          </span>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${labelBadge("cumprido").className}`}>
            {labelBadge("cumprido").texto}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
          <span>
            Atenção: prazos pendentes com data entre hoje e os próximos {ATENCAO_DIAS} dias.
          </span>
        </div>
      </div>
    </div>
  );
}
