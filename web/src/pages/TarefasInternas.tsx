import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTarefasInternas,
  getTarefaLabels,
  getUsuarios,
  updateTarefaInterna,
  cumprirTarefaInterna,
  cobrarTarefaInterna,
  TAREFA_INTERNA_TIPOS_OPT,
  type TarefaInternaItem,
} from "@/lib/api";
import { getUser } from "@/lib/auth";

function fmtData(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function TarefasInternas() {
  const user = getUser();
  const [sp, setSp] = useSearchParams();
  const qc = useQueryClient();

  const [status, setStatus] = useState(sp.get("status") || "pendente");
  const [atrasadas, setAtrasadas] = useState(sp.get("atrasadas") === "1");
  const [idResp, setIdResp] = useState(sp.get("idResponsavel") || "");
  const [idCri, setIdCri] = useState(sp.get("idCriador") || "");
  const [prazoId, setPrazoId] = useState(sp.get("prazoId") || "");
  const [tipo, setTipo] = useState(sp.get("tipo") || "");
  const [dIni, setDIni] = useState(sp.get("dataLimiteInicio") || "");
  const [dFim, setDFim] = useState(sp.get("dataLimiteFim") || "");
  const [labelPick, setLabelPick] = useState<number[]>(() => {
    const raw = sp.get("labelIds");
    if (!raw) return [];
    return raw.split(",").map((x) => parseInt(x, 10)).filter((n) => Number.isInteger(n));
  });

  const [edit, setEdit] = useState<TarefaInternaItem | null>(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editTipo, setEditTipo] = useState("");
  const [editData, setEditData] = useState("");
  const [editResp, setEditResp] = useState(0);
  const [editLabels, setEditLabels] = useState<number[]>([]);

  const params = useMemo(() => {
    const r = idResp ? parseInt(idResp, 10) : NaN;
    const c = idCri ? parseInt(idCri, 10) : NaN;
    const p = prazoId ? parseInt(prazoId, 10) : NaN;
    return {
      status: status || undefined,
      atrasadas: atrasadas || undefined,
      idResponsavel: Number.isInteger(r) && r > 0 ? r : undefined,
      idCriador: Number.isInteger(c) && c > 0 ? c : undefined,
      prazoId: Number.isInteger(p) && p > 0 ? p : undefined,
      tipo: tipo || undefined,
      dataLimiteInicio: dIni || undefined,
      dataLimiteFim: dFim || undefined,
      labelIds: labelPick.length ? labelPick : undefined,
    };
  }, [status, atrasadas, idResp, idCri, prazoId, tipo, dIni, dFim, labelPick]);

  const { data: lista = [], isPending } = useQuery({
    queryKey: ["tarefas-internas", "lista", params],
    queryFn: () => getTarefasInternas(params),
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios", "tarefas"],
    queryFn: () => getUsuarios(),
  });

  const { data: labelsDisponiveis = [] } = useQuery({
    queryKey: ["tarefa-labels"],
    queryFn: () => getTarefaLabels(),
  });

  const aplicarFiltros = () => {
    const n = new URLSearchParams();
    if (status) n.set("status", status);
    if (atrasadas) n.set("atrasadas", "1");
    if (idResp) n.set("idResponsavel", idResp);
    if (idCri) n.set("idCriador", idCri);
    if (prazoId) n.set("prazoId", prazoId);
    if (tipo) n.set("tipo", tipo);
    if (dIni) n.set("dataLimiteInicio", dIni);
    if (dFim) n.set("dataLimiteFim", dFim);
    if (labelPick.length) n.set("labelIds", labelPick.join(","));
    setSp(n);
  };

  const patchMutation = useMutation({
    mutationFn: () =>
      updateTarefaInterna(edit!.id, {
        titulo: editTitulo.trim(),
        descricao: editDesc.trim() || null,
        tipo: editTipo,
        dataLimite: editData,
        idResponsavel: editResp,
        labelIds: editLabels,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tarefas-internas"] });
      setEdit(null);
    },
  });

  const cumprirMutation = useMutation({
    mutationFn: (id: number) => cumprirTarefaInterna(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tarefas-internas"] }),
  });

  const cobrarMutation = useMutation({
    mutationFn: (id: number) => cobrarTarefaInterna(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tarefas-internas"] }),
  });

  const cancelarMutation = useMutation({
    mutationFn: (id: number) => updateTarefaInterna(id, { status: "cancelada" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tarefas-internas"] }),
  });

  const openEdit = (t: TarefaInternaItem) => {
    setEdit(t);
    setEditTitulo(t.titulo);
    setEditDesc(t.descricao ?? "");
    setEditTipo(t.tipo);
    setEditData(t.dataLimite);
    setEditResp(t.idResponsavel);
    setEditLabels(t.labels.map((l) => l.id));
  };

  const toggleEditLabel = (id: number) => {
    setEditLabels((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const opcoesRespEdit = usuarios.filter((u) => u.ativo && u.id !== user?.id);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Tarefas internas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lista central de providências do escritório. Crie novas tarefas a partir do{" "}
          <Link to="/prazos" className="text-primary hover:underline">
            detalhe do prazo
          </Link>
          .
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="mb-3 text-sm font-medium text-foreground">Filtros</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs text-muted-foreground">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="pendente">Pendentes</option>
              <option value="cumprida">Cumpridas</option>
              <option value="cancelada">Canceladas</option>
            </select>
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" checked={atrasadas} onChange={(e) => setAtrasadas(e.target.checked)} />
            Só atrasadas (pendentes com limite passado)
          </label>
          <label className="text-xs text-muted-foreground">
            ID do prazo
            <input
              type="number"
              value={prazoId}
              onChange={(e) => setPrazoId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Opcional"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Responsável
            <select
              value={idResp}
              onChange={(e) => setIdResp(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {usuarios
                .filter((u) => u.ativo)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {(u.pessoa ? `${u.pessoa.nome} ${u.pessoa.sobrenome}` : u.login).trim()}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">
            Criador
            <select
              value={idCri}
              onChange={(e) => setIdCri(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {usuarios
                .filter((u) => u.ativo)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {(u.pessoa ? `${u.pessoa.nome} ${u.pessoa.sobrenome}` : u.login).trim()}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">
            Tipo
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {TAREFA_INTERNA_TIPOS_OPT.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">
            Limite de
            <input
              type="date"
              value={dIni}
              onChange={(e) => setDIni(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Limite até
            <input
              type="date"
              value={dFim}
              onChange={(e) => setDFim(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Labels</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {labelsDisponiveis.map((l) => (
              <label key={l.id} className="flex cursor-pointer items-center gap-1">
                <input
                  type="checkbox"
                  checked={labelPick.includes(l.id)}
                  onChange={() =>
                    setLabelPick((prev) =>
                      prev.includes(l.id) ? prev.filter((x) => x !== l.id) : [...prev, l.id]
                    )
                  }
                />
                {l.nome}
              </label>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={aplicarFiltros}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Aplicar filtros
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {isPending ? (
          <p className="p-4 text-sm text-muted-foreground">Carregando…</p>
        ) : lista.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Nenhuma tarefa com estes filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="p-3 font-medium">Título</th>
                  <th className="p-3 font-medium">Limite</th>
                  <th className="p-3 font-medium">Responsável</th>
                  <th className="p-3 font-medium">Criador</th>
                  <th className="p-3 font-medium">Prazo</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((t) => (
                  <tr key={t.id} className="border-b border-border/60">
                    <td className="p-3">
                      <span className="font-medium text-foreground">{t.titulo}</span>
                      {t.labels.length > 0 && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {t.labels.map((l) => l.nome).join(", ")}
                        </p>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">{fmtData(t.dataLimite)}</td>
                    <td className="p-3">{t.nomeResponsavel}</td>
                    <td className="p-3">{t.nomeCriador}</td>
                    <td className="p-3">
                      <Link className="text-primary hover:underline" to={`/prazos/${t.prazoId}`}>
                        #{t.prazoId}
                      </Link>
                      {t.numeroProcesso && (
                        <span className="block text-xs text-muted-foreground">{t.numeroProcesso}</span>
                      )}
                    </td>
                    <td className="p-3">
                      {t.status === "pendente" ? "Pendente" : t.status === "cumprida" ? "Cumprida" : "Cancelada"}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {t.status === "pendente" && user?.id === t.idResponsavel && (
                          <button
                            type="button"
                            onClick={() => cumprirMutation.mutate(t.id)}
                            className="rounded border px-2 py-0.5 text-xs hover:bg-muted"
                          >
                            Cumprir
                          </button>
                        )}
                        {t.podeCobrar && user?.id === t.idCriador && (
                          <button
                            type="button"
                            onClick={() => cobrarMutation.mutate(t.id)}
                            className="rounded border border-amber-600/40 px-2 py-0.5 text-xs"
                          >
                            Cobrança
                          </button>
                        )}
                        {t.status === "pendente" && user?.id === t.idCriador && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(t)}
                              className="rounded border px-2 py-0.5 text-xs hover:bg-muted"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm("Cancelar tarefa?")) cancelarMutation.mutate(t.id);
                              }}
                              className="rounded border px-2 py-0.5 text-xs text-destructive"
                            >
                              Cancelar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-lg">
            <h2 className="text-lg font-semibold">Editar tarefa interna</h2>
            <p className="text-xs text-muted-foreground">Alterações reenviam aviso ao responsável e recalculam o alerta D−3.</p>
            <div className="mt-4 space-y-3">
              <input
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                value={editTitulo}
                onChange={(e) => setEditTitulo(e.target.value)}
                placeholder="Título"
              />
              <textarea
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={2}
              />
              <select
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                value={editTipo}
                onChange={(e) => setEditTipo(e.target.value)}
              >
                {TAREFA_INTERNA_TIPOS_OPT.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                value={editData}
                onChange={(e) => setEditData(e.target.value)}
              />
              <select
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                value={editResp}
                onChange={(e) => setEditResp(parseInt(e.target.value, 10))}
              >
                {opcoesRespEdit.map((u) => (
                  <option key={u.id} value={u.id}>
                    {(u.pessoa ? `${u.pessoa.nome} ${u.pessoa.sobrenome}` : u.login).trim()}
                  </option>
                ))}
              </select>
              <div className="text-xs">
                <span className="text-muted-foreground">Labels</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {labelsDisponiveis.map((l) => (
                    <label key={l.id} className="flex cursor-pointer items-center gap-1">
                      <input
                        type="checkbox"
                        checked={editLabels.includes(l.id)}
                        onChange={() => toggleEditLabel(l.id)}
                      />
                      {l.nome}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            {patchMutation.isError && (
              <p className="mt-2 text-sm text-destructive">
                {patchMutation.error instanceof Error ? patchMutation.error.message : "Erro"}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => patchMutation.mutate()}
                disabled={patchMutation.isPending || !editTitulo.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={() => setEdit(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
