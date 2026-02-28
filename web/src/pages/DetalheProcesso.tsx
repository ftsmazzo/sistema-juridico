import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProcesso,
  getClientes,
  getUsuarios,
  updateProcesso,
  type ProcessoDetalhe,
} from "@/lib/api";

function formatarData(iso: string | null | undefined) {
  if (!iso) return "—";
  const s = typeof iso === "string" ? iso : String(iso);
  return new Date(s).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function Campo({
  label,
  valor,
}: {
  label: string;
  valor: string | number | null | undefined;
}) {
  const v = valor != null && valor !== "" ? String(valor) : "—";
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-words text-sm text-foreground">{v}</p>
    </div>
  );
}

export function DetalheProcesso() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [aba, setAba] = useState<"dados" | "cliente" | "advogado" | "movimentacoes" | "vinculos">("dados");
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<Partial<Record<string, unknown>>>({});

  const procId = id ? parseInt(id, 10) : NaN;
  const { data: proc, isPending, isError } = useQuery({
    queryKey: ["processo", procId],
    queryFn: () => getProcesso(procId),
    enabled: Number.isFinite(procId),
  });

  const { data: clientesList = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: () => getClientes({}),
    enabled: editando,
  });

  const { data: usuariosList = [] } = useQuery({
    queryKey: ["usuarios"],
    queryFn: () => getUsuarios({}),
    enabled: editando,
  });

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => updateProcesso(procId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processo", procId] });
      queryClient.invalidateQueries({ queryKey: ["processos"] });
      setEditando(false);
      setForm({});
    },
  });

  const handleSave = () => {
    mutation.mutate(form);
  };

  const openEdit = () => {
    if (!proc) return;
    setForm({
      status: proc.status,
      tipo: (proc as Record<string, unknown>).tipo,
      fase: (proc as Record<string, unknown>).fase,
      tipoAcao: proc.tipoAcao,
      tipoCliente: (proc as Record<string, unknown>).tipoCliente,
      idCliente: (proc as Record<string, unknown>).idCliente,
      nomeCliente: (proc as Record<string, unknown>).nomeCliente,
      qualificacaoCliente: (proc as Record<string, unknown>).qualificacaoCliente,
      outroEnvolvido: (proc as Record<string, unknown>).outroEnvolvido,
      qualificacaoOutro: (proc as Record<string, unknown>).qualificacaoOutro,
      idAdvogadoResponsavel: (proc as Record<string, unknown>).idAdvogadoResponsavel,
      nomeAdvogado: (proc as Record<string, unknown>).nomeAdvogado,
      comarca: (proc as Record<string, unknown>).comarca,
      vara: (proc as Record<string, unknown>).vara,
      instancia: (proc as Record<string, unknown>).instancia,
      observacoes: (proc as Record<string, unknown>).observacoes,
      dataPrazo: (proc.dataPrazo ?? "").toString().slice(0, 10),
      dataInicio: (proc.dataInicio ?? "").toString().slice(0, 10),
      dataFim: ((proc as Record<string, unknown>).dataFim ?? "").toString().slice(0, 10),
      valorCausa: (proc as Record<string, unknown>).valorCausa,
      valorAcordoSentenca: (proc as Record<string, unknown>).valorAcordoSentenca,
      resultado: (proc as Record<string, unknown>).resultado,
      linkProcesso: (proc as Record<string, unknown>).linkProcesso,
      linkPastaDocumentos: (proc as Record<string, unknown>).linkPastaDocumentos,
      titulo: (proc as Record<string, unknown>).titulo,
    });
    setEditando(true);
  };

  if (!Number.isFinite(procId)) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">ID inválido.</p>
        <Link to="/processos" className="text-primary underline">← Voltar</Link>
      </div>
    );
  }

  if (isError || (!isPending && !proc)) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">Processo não encontrado.</p>
        <Link to="/processos" className="text-primary underline">← Voltar</Link>
      </div>
    );
  }

  if (isPending && !proc) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Carregando…
      </div>
    );
  }

  const p = proc as ProcessoDetalhe & Record<string, unknown>;
  const cliente = p.cliente as Record<string, unknown> | null;
  const advogado = p.advogado as { id: number; nomeCompleto: string; login: string } | null;
  const movimentacoes = (p.movimentacoes || []) as {
    id: number;
    ordem: number;
    movimentacao: string | null;
    dataMovimentacao: string | null;
  }[];
  const tabs = [
    { id: "dados" as const, label: "Dados do processo" },
    { id: "cliente" as const, label: "Cliente" },
    { id: "advogado" as const, label: "Advogado" },
    { id: "movimentacoes" as const, label: "Movimentações" },
    { id: "vinculos" as const, label: "Prazos e publicações" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/processos" className="text-sm text-primary hover:underline">
            ← Processos
          </Link>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {p.numeroCnj}
          </h2>
          <p className="text-muted-foreground">
            {p.tipoAcao ?? "—"} · {p.status} {p.fase ? `· ${p.fase}` : ""}
          </p>
        </div>
        {!editando ? (
          <button
            type="button"
            onClick={openEdit}
            className="shrink-0 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Editar
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setEditando(false); setForm({}); }}
              className="shrink-0 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={mutation.isPending}
              className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {mutation.isPending ? "Salvando…" : "Salvar"}
            </button>
          </div>
        )}
      </div>

      {mutation.isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
          {mutation.error instanceof Error ? mutation.error.message : "Erro ao salvar."}
        </div>
      )}

      {/* Abas */}
      <div className="border-b border-border">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setAba(tab.id)}
              className={`border-b-2 py-2 text-sm font-medium transition-colors ${
                aba === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Conteúdo por aba */}
      {aba === "dados" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 font-semibold text-foreground">Identificação</h3>
            <div className="space-y-4">
              <Campo label="Número CNJ" valor={p.numeroCnj} />
              <Campo label="Status" valor={p.status} />
              <Campo label="Tipo" valor={p.tipo} />
              <Campo label="Fase" valor={p.fase} />
              <Campo label="Tipo da ação" valor={p.tipoAcao} />
              <Campo label="Comarca" valor={p.comarca as string | null} />
              <Campo label="Vara" valor={p.vara as string | null} />
              <Campo label="Instância" valor={p.instancia as string | null} />
            </div>
          </section>
          <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 font-semibold text-foreground">Datas e valores</h3>
            <div className="space-y-4">
              <Campo label="Data início" valor={formatarData(p.dataInicio)} />
              <Campo label="Data fim" valor={formatarData(p.dataFim as string | null)} />
              <Campo label="Data prazo" valor={formatarData(p.dataPrazo)} />
              <Campo label="Prazo em aberto" valor={p.prazoEmAberto ? "Sim" : "Não"} />
              <Campo label="Valor da causa" valor={p.valorCausa as string | null} />
              <Campo label="Valor acordo/sentença" valor={p.valorAcordoSentenca as string | null} />
              <Campo label="Resultado" valor={p.resultado as string | null} />
              {(p.linkProcesso as string | null) ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Link do processo</p>
                  <a
                    href={String(p.linkProcesso)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 block break-all text-sm text-primary hover:underline"
                  >
                    {String(p.linkProcesso)}
                  </a>
                </div>
              ) : null}
              {(p.linkPastaDocumentos as string | null) ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Link pasta documentos</p>
                  <a
                    href={String(p.linkPastaDocumentos)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 block break-all text-sm text-primary hover:underline"
                  >
                    {String(p.linkPastaDocumentos)}
                  </a>
                </div>
              ) : null}
              <Campo label="Observações" valor={p.observacoes as string | null} />
            </div>
          </section>
          {editando && (
            <section className="rounded-xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
              <h3 className="mb-4 font-semibold text-foreground">Editar campos</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <select
                    value={String(form.status ?? "")}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Encerrado">Encerrado</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Cliente</label>
                  <select
                    value={form.idCliente != null ? String(form.idCliente) : ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        idCliente: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {clientesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.tipo === "PJ" ? c.razaoSocial || c.nome : c.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Advogado</label>
                  <select
                    value={form.idAdvogadoResponsavel != null ? String(form.idAdvogadoResponsavel) : ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        idAdvogadoResponsavel: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {usuariosList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.pessoa ? `${u.pessoa.nome} ${u.pessoa.sobrenome}` : u.login}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Data prazo</label>
                  <input
                    type="date"
                    value={String(form.dataPrazo ?? "").slice(0, 10)}
                    onChange={(e) => setForm((f) => ({ ...f, dataPrazo: e.target.value || null }))}
                    className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Data início</label>
                  <input
                    type="date"
                    value={String(form.dataInicio ?? "").slice(0, 10)}
                    onChange={(e) => setForm((f) => ({ ...f, dataInicio: e.target.value || null }))}
                    className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Comarca</label>
                  <input
                    type="text"
                    value={String(form.comarca ?? "")}
                    onChange={(e) => setForm((f) => ({ ...f, comarca: e.target.value || null }))}
                    className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Vara</label>
                  <input
                    type="text"
                    value={String(form.vara ?? "")}
                    onChange={(e) => setForm((f) => ({ ...f, vara: e.target.value || null }))}
                    className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {aba === "cliente" && (
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-foreground">Cliente vinculado</h3>
          {cliente ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Nome" valor={cliente.nome as string} />
              <Campo label="Tipo" valor={cliente.tipo as string} />
              <Campo label="Razão social" valor={cliente.razaoSocial as string} />
              <Campo label="CPF" valor={cliente.cpf as string} />
              <Campo label="CNPJ" valor={cliente.cnpj as string} />
              <Campo label="Cidade" valor={cliente.cidade as string} />
              <Campo label="Estado" valor={cliente.estado as string} />
            </div>
          ) : (
            <p className="text-muted-foreground">
              Nenhum cliente vinculado ao processo (nome do cliente: {p.nomeCliente ?? "—"}).
            </p>
          )}
        </section>
      )}

      {aba === "advogado" && (
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-foreground">Advogado responsável</h3>
          {advogado ? (
            <div className="space-y-2">
              <Campo label="Nome" valor={advogado.nomeCompleto} />
              <Campo label="Login" valor={advogado.login} />
            </div>
          ) : (
            <p className="text-muted-foreground">
              Nenhum advogado vinculado (nome na planilha: {p.nomeAdvogado ?? "—"}).
            </p>
          )}
        </section>
      )}

      {aba === "movimentacoes" && (
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-foreground">Histórico de movimentações</h3>
          {(p.dataUltimaMovimentacao != null && String(p.dataUltimaMovimentacao).trim() !== "") && (
            <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Última movimentação (Escavador)
              </p>
              <p className="mt-0.5 text-sm font-medium text-foreground">
                {formatarData(String(p.dataUltimaMovimentacao))}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Data atualizada a partir dos dados sincronizados do Escavador para este processo.
              </p>
            </div>
          )}
          {movimentacoes.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma movimentação registrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-2 font-medium text-foreground">Ordem</th>
                    <th className="px-4 py-2 font-medium text-foreground">Data</th>
                    <th className="px-4 py-2 font-medium text-foreground">Movimentação</th>
                  </tr>
                </thead>
                <tbody>
                  {movimentacoes.map((m) => (
                    <tr key={m.id} className="border-b border-border/60">
                      <td className="px-4 py-2 text-muted-foreground">{m.ordem}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {formatarData(m.dataMovimentacao)}
                      </td>
                      <td className="px-4 py-2 text-foreground">{m.movimentacao ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {aba === "vinculos" && (
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-foreground">Prazos e publicações</h3>
          <div className="flex flex-wrap gap-4">
            <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 min-w-[140px]">
              <p className="text-2xl font-semibold text-foreground">{p.totalPrazos ?? 0}</p>
              <p className="text-xs text-muted-foreground">Prazos vinculados</p>
              <Link to="/prazos" className="mt-1 block text-sm text-primary hover:underline">
                Ver prazos
              </Link>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 min-w-[140px]">
              <p className="text-2xl font-semibold text-foreground">{p.totalPublicacoes ?? 0}</p>
              <p className="text-xs text-muted-foreground">Publicações vinculadas</p>
              <Link to="/publicacoes" className="mt-1 block text-sm text-primary hover:underline">
                Ver publicações
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
