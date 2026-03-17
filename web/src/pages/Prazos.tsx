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
          Calendário e filtros para visualizar prazos processuais.
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
          {linkUrl && (
          <>
            <div className="flex w-full flex-1 basis-full items-center gap-2 md:w-auto md:flex-1">
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
            <p className="mt-3 text-xs text-muted-foreground">
              No Google Calendar: Outros calendários → Inscrever-se por URL. No Outlook: Adicionar
              calendário → Assinar da Web. Cole o link acima.
            </p>
            {typeof totalPrazos === "number" && (
              <p className="mt-1 text-xs text-muted-foreground">
                {totalPrazos === 0
                  ? "Você não tem prazos vinculados ao seu usuário (por OAB). O feed mostrará todos os prazos do sistema até haver vínculos."
                  : `Seu link contém ${totalPrazos} prazo(s) no momento.`}
              </p>
            )}
          </>
        )}
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

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-6 rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm">
        <span className="font-medium text-muted-foreground">Legenda:</span>
        <span className="flex items-center gap-2">
          <span className="rounded bg-amber-500/20 px-2 py-0.5 text-amber-800 dark:text-amber-200">
            Pendente
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground">
            Cumprido
          </span>
        </span>
      </div>
    </div>
  );
}
