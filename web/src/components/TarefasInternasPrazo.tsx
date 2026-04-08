import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTarefasInternas,
  createTarefaInterna,
  cumprirTarefaInterna,
  cobrarTarefaInterna,
  updateTarefaInterna,
  getTarefaLabels,
  createTarefaLabel,
  getUsuarios,
  TAREFA_INTERNA_TIPOS_OPT,
} from "@/lib/api";
import { getUser } from "@/lib/auth";

function fmtData(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type Props = { prazoId: number };

export function TarefasInternasPrazo({ prazoId }: Props) {
  const user = getUser();
  const qc = useQueryClient();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<string>(TAREFA_INTERNA_TIPOS_OPT[0].value);
  const [dataLimite, setDataLimite] = useState("");
  const [idResponsavel, setIdResponsavel] = useState<number>(0);
  const [labelIdsSel, setLabelIdsSel] = useState<number[]>([]);
  const [novaLabel, setNovaLabel] = useState("");

  const { data: tarefas = [], isPending } = useQuery({
    queryKey: ["tarefas-internas", "prazo", prazoId],
    queryFn: () => getTarefasInternas({ prazoId }),
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios", "tarefas"],
    queryFn: () => getUsuarios(),
  });

  const { data: labelsDisponiveis = [] } = useQuery({
    queryKey: ["tarefa-labels"],
    queryFn: () => getTarefaLabels(),
  });

  const criarMutation = useMutation({
    mutationFn: () =>
      createTarefaInterna({
        prazoId,
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        tipo,
        dataLimite,
        idResponsavel,
        labelIds: labelIdsSel,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tarefas-internas"] });
      setTitulo("");
      setDescricao("");
      setLabelIdsSel([]);
      setNovaLabel("");
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

  const addLabelMutation = useMutation({
    mutationFn: (nome: string) => createTarefaLabel(nome),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["tarefa-labels"] });
      setLabelIdsSel((prev) => [...prev, row.id]);
      setNovaLabel("");
    },
  });

  const opcoesResponsavel = usuarios.filter((u) => u.ativo && u.id !== user?.id);

  const toggleLabel = (id: number) => {
    setLabelIdsSel((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleCriar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !dataLimite || !idResponsavel || criarMutation.isPending) return;
    criarMutation.mutate();
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Tarefas internas do escritório</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Providências delegadas; alertas por WhatsApp (escritório).{" "}
            <Link to="/tarefas-internas" className="text-primary hover:underline">
              Ver todas em lista →
            </Link>
          </p>
        </div>
      </div>

      {isPending ? (
        <p className="text-sm text-muted-foreground">Carregando tarefas…</p>
      ) : tarefas.length === 0 ? (
        <p className="mb-4 text-sm text-muted-foreground">Nenhuma tarefa interna neste prazo.</p>
      ) : (
        <ul className="mb-4 space-y-2">
          {tarefas.map((t) => (
            <li
              key={t.id}
              className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{t.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {TAREFA_INTERNA_TIPOS_OPT.find((o) => o.value === t.tipo)?.label ?? t.tipo} · Limite{" "}
                    {fmtData(t.dataLimite)} · {t.nomeResponsavel}
                  </p>
                  {t.labels.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.labels.map((l) => l.nome).join(", ")}
                    </p>
                  )}
                  <p className="mt-1 text-xs">
                    <span
                      className={
                        t.status === "pendente"
                          ? "text-amber-700 dark:text-amber-300"
                          : t.status === "cumprida"
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-muted-foreground"
                      }
                    >
                      {t.status === "pendente" ? "Pendente" : t.status === "cumprida" ? "Cumprida" : "Cancelada"}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {t.status === "pendente" && user?.id === t.idResponsavel && (
                    <button
                      type="button"
                      onClick={() => cumprirMutation.mutate(t.id)}
                      disabled={cumprirMutation.isPending}
                      className="rounded border border-border bg-background px-2 py-1 text-xs hover:bg-muted"
                    >
                      Cumprir
                    </button>
                  )}
                  {t.podeCobrar && user?.id === t.idCriador && (
                    <button
                      type="button"
                      onClick={() => cobrarMutation.mutate(t.id)}
                      disabled={cobrarMutation.isPending}
                      className="rounded border border-amber-600/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-900 dark:text-amber-200"
                    >
                      Cobrança
                    </button>
                  )}
                  {t.status === "pendente" && user?.id === t.idCriador && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Cancelar esta tarefa interna?")) cancelarMutation.mutate(t.id);
                      }}
                      disabled={cancelarMutation.isPending}
                      className="rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:text-destructive"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {user && (
        <form onSubmit={handleCriar} className="space-y-3 border-t border-border pt-4">
          <p className="text-xs font-medium text-foreground">Nova tarefa interna</p>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título *"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            required
          />
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descrição (opcional)"
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-muted-foreground">
              Tipo *
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {TAREFA_INTERNA_TIPOS_OPT.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              Data limite *
              <input
                type="date"
                value={dataLimite}
                onChange={(e) => setDataLimite(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                required
              />
            </label>
          </div>
          <label className="block text-xs text-muted-foreground">
            Responsável * (outro usuário)
            <select
              value={idResponsavel || ""}
              onChange={(e) => setIdResponsavel(parseInt(e.target.value, 10) || 0)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">Selecione…</option>
              {opcoesResponsavel.map((u) => (
                <option key={u.id} value={u.id}>
                  {(u.pessoa ? `${u.pessoa.nome} ${u.pessoa.sobrenome}` : u.login).trim()} ({u.login})
                </option>
              ))}
            </select>
          </label>
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Labels</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {labelsDisponiveis.map((l) => (
                <label key={l.id} className="flex cursor-pointer items-center gap-1">
                  <input
                    type="checkbox"
                    checked={labelIdsSel.includes(l.id)}
                    onChange={() => toggleLabel(l.id)}
                  />
                  {l.nome}
                </label>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={novaLabel}
                onChange={(e) => setNovaLabel(e.target.value)}
                placeholder="Nova label"
                className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  const n = novaLabel.trim();
                  if (n) addLabelMutation.mutate(n);
                }}
                disabled={!novaLabel.trim() || addLabelMutation.isPending}
                className="rounded border border-border px-2 py-1 text-sm hover:bg-muted"
              >
                + Adicionar
              </button>
            </div>
          </div>
          {criarMutation.isError && (
            <p className="text-sm text-destructive">
              {criarMutation.error instanceof Error ? criarMutation.error.message : "Erro ao criar"}
            </p>
          )}
          <button
            type="submit"
            disabled={criarMutation.isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {criarMutation.isPending ? "Salvando…" : "Criar tarefa"}
          </button>
        </form>
      )}
    </div>
  );
}
