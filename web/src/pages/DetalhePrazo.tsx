import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPrazoById,
  updatePrazo,
  createSubtarefa,
  updateSubtarefa,
  deleteSubtarefa,
  sugerirSubtarefas as apiSugerirSubtarefas,
  type PrazoSubtarefaItem,
} from "@/lib/api";
import { getUser } from "@/lib/auth";
import { TarefasInternasPrazo } from "@/components/TarefasInternasPrazo";

function formatarData(data: string | null) {
  if (!data) return "—";
  return new Date(data + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Domínios que bloqueiam exibição em iframe (OneDrive, Google Drive, etc.). */
function linkBloqueiaIframe(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host.includes("onedrive.live.com") ||
      host.includes("sharepoint.com") ||
      host.includes("drive.google.com") ||
      host.includes("dropbox.com")
    );
  } catch {
    return false;
  }
}

export function DetalhePrazo() {
  const { id } = useParams<{ id: string }>();
  const prazoId = id ? parseInt(id, 10) : NaN;
  const [novoTitulo, setNovoTitulo] = useState("");
  const [sugestoes, setSugestoes] = useState<{ titulo: string }[]>([]);
  const [sugestoesLoading, setSugestoesLoading] = useState(false);
  const [sugestoesError, setSugestoesError] = useState<string | null>(null);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [linkPecaInput, setLinkPecaInput] = useState("");
  const [mostrarVisualizador, setMostrarVisualizador] = useState(false);

  const queryClient = useQueryClient();
  const { data: prazo, isPending, error } = useQuery({
    queryKey: ["prazo", prazoId],
    queryFn: () => getPrazoById(prazoId),
    enabled: Number.isInteger(prazoId) && prazoId > 0,
  });

  const createMutation = useMutation({
    mutationFn: (titulo: string) => createSubtarefa(prazoId, titulo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prazo", prazoId] });
      setNovoTitulo("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      idItem,
      data,
    }: {
      idItem: number;
      data: { titulo?: string; concluida?: boolean };
    }) => updateSubtarefa(prazoId, idItem, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prazo", prazoId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (idItem: number) => deleteSubtarefa(prazoId, idItem),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prazo", prazoId] });
    },
  });

  const updatePrazoMutation = useMutation({
    mutationFn: (body: { cumprido?: boolean; linkPeca?: string | null }) =>
      updatePrazo(prazoId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prazo", prazoId] });
      queryClient.invalidateQueries({ queryKey: ["prazos"] });
      setLinkPecaInput("");
    },
  });

  const handleAddSubtarefa = (e: React.FormEvent) => {
    e.preventDefault();
    const t = novoTitulo.trim();
    if (!t || createMutation.isPending) return;
    createMutation.mutate(t);
  };

  const handleToggleConcluida = (item: PrazoSubtarefaItem) => {
    updateMutation.mutate({ idItem: item.id, data: { concluida: !item.concluida } });
  };

  const handleRemoverSubtarefa = (idItem: number) => {
    if (deleteMutation.isPending) return;
    if (window.confirm("Remover este item da lista?")) deleteMutation.mutate(idItem);
  };

  const handleSugerirComIa = async () => {
    setSugestoesError(null);
    setSugestoesLoading(true);
    setMostrarSugestoes(false);
    try {
      const data = await apiSugerirSubtarefas(prazoId);
      setSugestoes(data.itens ?? []);
      setMostrarSugestoes(true);
    } catch (e) {
      setSugestoesError(e instanceof Error ? e.message : "Erro ao sugerir passos.");
      setSugestoes([]);
    } finally {
      setSugestoesLoading(false);
    }
  };

  const handleAdicionarSugestao = (titulo: string) => {
    createMutation.mutate(titulo);
    setSugestoes((prev) => prev.filter((s) => s.titulo !== titulo));
  };

  const handleAdicionarTodasSugestoes = () => {
    sugestoes.forEach((s) => createMutation.mutate(s.titulo));
    setSugestoes([]);
    setMostrarSugestoes(false);
    queryClient.invalidateQueries({ queryKey: ["prazo", prazoId] });
  };

  if (!Number.isInteger(prazoId) || prazoId < 1) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">ID do prazo inválido.</p>
        <Link to="/prazos" className="text-primary hover:underline">
          ← Voltar para Prazos
        </Link>
      </div>
    );
  }

  if (isPending || error) {
    return (
      <div className="space-y-4">
        {isPending && <p className="text-muted-foreground">Carregando…</p>}
        {error && (
          <p className="text-destructive">
            {error instanceof Error ? error.message : "Erro ao carregar prazo."}
          </p>
        )}
        <Link to="/prazos" className="text-primary hover:underline">
          ← Voltar para Prazos
        </Link>
      </div>
    );
  }

  if (!prazo) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Prazo não encontrado.</p>
        <Link to="/prazos" className="text-primary hover:underline">
          ← Voltar para Prazos
        </Link>
      </div>
    );
  }

  const temResumo =
    prazo.resumoPublicacao?.trim() ||
    prazo.resumoMovimentacao?.trim() ||
    prazo.conteudo?.trim();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/prazos" className="text-sm text-muted-foreground hover:text-foreground">
          ← Prazos
        </Link>
      </div>

      {/* Cabeçalho */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{prazo.prazo}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatarData(prazo.data)} · {prazo.tipo}
              {prazo.numeroProcesso && ` · ${prazo.numeroProcesso}`}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              prazo.status === 0
                ? "bg-amber-500/20 text-amber-800 dark:text-amber-200"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {prazo.status === 0 ? "Pendente" : "Cumprido"}
          </span>
        </div>
        {prazo.observacao?.trim() && (
          <p className="mt-2 text-sm text-muted-foreground">{prazo.observacao}</p>
        )}

        {/* Dar cumprimento (logado e prazo pendente) */}
        {prazo.status === 0 && getUser() && (
          <div className="mt-4 rounded-lg border border-border/60 bg-muted/20 p-3">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Dar cumprimento ao prazo</h3>
            <p className="mb-2 text-xs text-muted-foreground">
              Opcional: informe o link da peça no OneDrive (ou outro) para anexar ao cumprimento.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <input
                type="url"
                value={linkPecaInput}
                onChange={(e) => setLinkPecaInput(e.target.value)}
                placeholder="https://... (OneDrive, SharePoint, etc.)"
                className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() =>
                  updatePrazoMutation.mutate({
                    cumprido: true,
                    linkPeca: linkPecaInput.trim() || undefined,
                  })
                }
                disabled={updatePrazoMutation.isPending}
                className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {updatePrazoMutation.isPending ? "Salvando…" : "Marcar como cumprido"}
              </button>
            </div>
          </div>
        )}

        {/* Documento anexado (peça) + visualizador */}
        {prazo.status !== 0 && prazo.linkPeca?.trim() && (
          <div className="mt-4 rounded-lg border border-border/60 bg-muted/20 p-3">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Documento anexado (peça)</h3>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={prazo.linkPeca}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-sm text-primary hover:underline max-w-[280px] sm:max-w-none"
                title={prazo.linkPeca}
              >
                {prazo.linkPeca}
              </a>
              <button
                type="button"
                onClick={() => setMostrarVisualizador(true)}
                className="rounded border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted"
              >
                Visualizar no sistema
              </button>
              <a
                href={prazo.linkPeca}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted"
              >
                Abrir em nova aba
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Modal visualizador de documento (iframe ou aviso para OneDrive/Drive) */}
      {mostrarVisualizador && prazo.linkPeca?.trim() && (() => {
        const url = prazo.linkPeca!;
        const bloqueiaIframe = linkBloqueiaIframe(url);
        return (
          <div
            className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Visualizar documento"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-2">
              <span className="text-sm font-medium text-foreground">Documento (peça)</span>
              <div className="flex gap-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  Abrir em nova aba
                </a>
                <button
                  type="button"
                  onClick={() => setMostrarVisualizador(false)}
                  className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  Fechar
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 p-2">
              {bloqueiaIframe ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 rounded border border-border bg-muted/30 p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Este link (OneDrive, Google Drive ou similar) não pode ser exibido dentro da página por segurança.
                  </p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    Abrir documento em nova aba
                  </a>
                </div>
              ) : (
                <iframe
                  title="Documento da peça"
                  src={url}
                  className="h-full w-full rounded border border-border bg-white"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              )}
            </div>
            {!bloqueiaIframe && (
              <p className="shrink-0 px-4 py-1 text-center text-xs text-muted-foreground">
                Se o documento não carregar aqui, use &quot;Abrir em nova aba&quot;.
              </p>
            )}
          </div>
        );
      })()}

      {/* Resumo / contexto (da publicação e movimentação) */}
      {temResumo && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Resumo e contexto</h2>
          <div className="space-y-3 text-sm text-foreground">
            {prazo.movimentacaoTipo?.trim() && (
              <p>
                <span className="font-medium text-muted-foreground">Movimentação: </span>
                {prazo.movimentacaoTipo}
              </p>
            )}
            {prazo.resumoMovimentacao?.trim() && (
              <p className="whitespace-pre-wrap">{prazo.resumoMovimentacao}</p>
            )}
            {prazo.resumoPublicacao?.trim() && (
              <p className="whitespace-pre-wrap">{prazo.resumoPublicacao}</p>
            )}
            {prazo.conteudo?.trim() && !prazo.resumoMovimentacao?.trim() && !prazo.resumoPublicacao?.trim() && (
              <p className="whitespace-pre-wrap">{prazo.conteudo}</p>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {prazo.publicacaoOabId != null && (
              <Link
                to={`/publicacoes/${prazo.publicacaoOabId}`}
                className="text-sm text-primary hover:underline"
              >
                Ver publicação completa →
              </Link>
            )}
            {prazo.processoId != null && (
              <Link
                to={`/processos/${prazo.processoId}`}
                className="text-sm text-primary hover:underline"
              >
                Ver processo →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Checklist (subtarefas) */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Passos para execução (checklist)
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Marque os itens conforme for cumprindo. Use para padronizar processos.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSugerirComIa}
            disabled={sugestoesLoading}
            className="shrink-0 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            {sugestoesLoading ? "Gerando…" : "Sugerir passos com IA"}
          </button>
        </div>
        {sugestoesError && (
          <p className="mb-3 text-sm text-destructive">{sugestoesError}</p>
        )}
        {mostrarSugestoes && sugestoes.length > 0 && (
          <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="mb-2 text-xs font-medium text-foreground">
              Passos sugeridos (com base na publicação e no processo):
            </p>
            <ul className="space-y-1.5">
              {sugestoes.map((s, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 text-foreground">{s.titulo}</span>
                  <button
                    type="button"
                    onClick={() => handleAdicionarSugestao(s.titulo)}
                    className="shrink-0 rounded border border-border bg-background px-2 py-1 text-xs hover:bg-muted"
                  >
                    Adicionar
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={handleAdicionarTodasSugestoes}
                className="rounded border border-primary bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Adicionar todos
              </button>
              <button
                type="button"
                onClick={() => { setMostrarSugestoes(false); setSugestoes([]); }}
                className="rounded border border-border px-3 py-1.5 text-xs hover:bg-muted"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        <ul className="space-y-2">
          {prazo.subtarefas.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
            >
              <button
                type="button"
                onClick={() => handleToggleConcluida(item)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border bg-background"
                aria-label={item.concluida ? "Desmarcar" : "Marcar como concluído"}
              >
                {item.concluida ? (
                  <span className="text-primary">✓</span>
                ) : (
                  <span className="text-muted-foreground">○</span>
                )}
              </button>
              <span
                className={`flex-1 text-sm ${
                  item.concluida ? "text-muted-foreground line-through" : "text-foreground"
                }`}
              >
                {item.titulo}
              </span>
              <button
                type="button"
                onClick={() => handleRemoverSubtarefa(item.id)}
                className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>

        <form onSubmit={handleAddSubtarefa} className="mt-4 flex gap-2">
          <input
            type="text"
            value={novoTitulo}
            onChange={(e) => setNovoTitulo(e.target.value)}
            placeholder="Ex.: Elaborar peça, protocolar, anexar comprovantes"
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={!novoTitulo.trim() || createMutation.isPending}
            className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {createMutation.isPending ? "…" : "Adicionar"}
          </button>
        </form>
      </div>

      <TarefasInternasPrazo prazoId={prazoId} />
    </div>
  );
}
