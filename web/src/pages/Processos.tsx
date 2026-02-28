import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProcessos,
  getProcesso,
  getClientes,
  getUsuarios,
  createProcesso,
  updateProcesso,
  importarExcelProcessos,
  sincronizarDadosEscavador,
  type ProcessoListItem,
  type ResultadoImportacao,
  type SincronizarEscavadorResultado,
} from "@/lib/api";

function formatarData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function Processos() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const [idCliente, setIdCliente] = useState<string>("");
  const [idAdvogado, setIdAdvogado] = useState<string>("");
  const [modalProcesso, setModalProcesso] = useState(false);
  const [modalImportar, setModalImportar] = useState(false);
  const [modalEscavador, setModalEscavador] = useState(false);
  const [editing, setEditing] = useState<ProcessoListItem | null>(null);
  const [escavadorOabUf, setEscavadorOabUf] = useState("");
  const [escavadorOabNumero, setEscavadorOabNumero] = useState("");
  const [resultadoEscavador, setResultadoEscavador] = useState<SincronizarEscavadorResultado[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [opcoesImport, setOpcoesImport] = useState({
    importarClientes: true,
    importarProcessos: true,
    importarMovimentacoes: true,
  });
  const [resultadoImport, setResultadoImport] = useState<ResultadoImportacao | null>(null);

  const { data: list = [], isPending, isError, error } = useQuery({
    queryKey: ["processos", q, status, idCliente, idAdvogado],
    queryFn: () =>
      getProcessos({
        q: q || undefined,
        status: status || undefined,
        idCliente: idCliente ? Number(idCliente) : undefined,
        idAdvogado: idAdvogado ? Number(idAdvogado) : undefined,
      }),
  });

  /** Mensagem de erro amigável (API pode retornar JSON { error: "..." }) */
  const errorMessage = (() => {
    if (!error?.message) return null;
    const msg = String(error.message);
    try {
      const j = JSON.parse(msg);
      if (j && typeof j.error === "string") return j.error;
    } catch {
      // não é JSON
    }
    return msg.length > 200 ? `${msg.slice(0, 200)}…` : msg;
  })();

  const { data: clientesList = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: () => getClientes({}),
  });

  const { data: usuariosList = [] } = useQuery({
    queryKey: ["usuarios"],
    queryFn: () => getUsuarios({}),
  });

  const { data: processoParaEditar } = useQuery({
    queryKey: ["processo", editing?.id],
    queryFn: () => getProcesso(editing!.id),
    enabled: !!editing?.id,
  });

  const createMutation = useMutation({
    mutationFn: createProcesso,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processos"] });
      setModalProcesso(false);
      setEditing(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      updateProcesso(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processos"] });
      setModalProcesso(false);
      setEditing(null);
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!arquivo) throw new Error("Selecione um arquivo");
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
          const s = (r.result as string) || "";
          const b = s.indexOf(",");
          resolve(b >= 0 ? s.slice(b + 1) : s);
        };
        r.onerror = reject;
        r.readAsDataURL(arquivo);
      });
      return importarExcelProcessos(base64, opcoesImport);
    },
    onSuccess: (data) => {
      setResultadoImport(data);
      queryClient.invalidateQueries({ queryKey: ["processos"] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
  });

  const escavadorMutation = useMutation({
    mutationFn: () =>
      sincronizarDadosEscavador({
        oab_uf: escavadorOabUf.trim(),
        oab_numero: escavadorOabNumero.trim(),
      }),
    onSuccess: (data) => {
      setResultadoEscavador(data.resultados ?? null);
    },
    onError: () => {
      setResultadoEscavador(null);
    },
  });

  function openNew() {
    setEditing(null);
    setModalProcesso(true);
  }

  function openEdit(p: ProcessoListItem) {
    setEditing(p);
    setModalProcesso(true);
  }

  function handleSubmitProcesso(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const body: Record<string, unknown> = {
      numeroCnj: (fd.get("numeroCnj") as string)?.trim(),
      status: (fd.get("status") as string)?.trim() || "Ativo",
      tipo: (fd.get("tipo") as string)?.trim() || undefined,
      fase: (fd.get("fase") as string)?.trim() || undefined,
      tipoAcao: (fd.get("tipoAcao") as string)?.trim() || undefined,
      nomeCliente: (fd.get("nomeCliente") as string)?.trim() || undefined,
      comarca: (fd.get("comarca") as string)?.trim() || undefined,
      vara: (fd.get("vara") as string)?.trim() || undefined,
      dataPrazo: (fd.get("dataPrazo") as string) || undefined,
      dataInicio: (fd.get("dataInicio") as string) || undefined,
    };
    const idClienteVal = fd.get("idCliente") as string;
    const idAdvVal = fd.get("idAdvogadoResponsavel") as string;
    if (idClienteVal) body.idCliente = Number(idClienteVal);
    if (idAdvVal) body.idAdvogadoResponsavel = Number(idAdvVal);
    if (editing) {
      updateMutation.mutate({ id: editing.id, body });
    } else {
      if (!body.numeroCnj) return;
      createMutation.mutate(body);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Processos
          </h2>
          <p className="text-muted-foreground">
            Cadastro e importação de processos (planilha LNSA). Visualize detalhes e movimentações.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setModalEscavador(true);
              setResultadoEscavador(null);
              setEscavadorOabUf("");
              setEscavadorOabNumero("");
            }}
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50"
          >
            Sincronizar Escavador
          </button>
          <button
            type="button"
            onClick={() => {
              setModalImportar(true);
              setResultadoImport(null);
              setArquivo(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50"
          >
            Importar Excel
          </button>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Novo processo
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <input
          type="search"
          placeholder="Buscar (número, cliente, ação, comarca)..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-w-[200px] rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Todos os status</option>
          <option value="Ativo">Ativo</option>
          <option value="Encerrado">Encerrado</option>
        </select>
        <select
          value={idCliente}
          onChange={(e) => setIdCliente(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Todos os clientes</option>
          {clientesList.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.tipo === "PJ" ? c.razaoSocial || c.nome : c.nome}
            </option>
          ))}
        </select>
        <select
          value={idAdvogado}
          onChange={(e) => setIdAdvogado(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Todos os advogados</option>
          {usuariosList.map((u) => (
            <option key={u.id} value={String(u.id)}>
              {u.pessoa ? `${u.pessoa.nome} ${u.pessoa.sobrenome}` : u.login}
            </option>
          ))}
        </select>
      </div>

      {isError && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-4 text-destructive">
          <p className="font-medium">Erro ao carregar processos. Tente novamente.</p>
          {errorMessage && (
            <p className="mt-1 text-sm opacity-90">{errorMessage}</p>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {isPending ? (
          <div className="flex min-h-[200px] items-center justify-center p-8 text-muted-foreground">
            Carregando…
          </div>
        ) : list.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-8 text-muted-foreground">
            <p>Nenhum processo encontrado.</p>
            <p className="text-sm">
              Use <strong>Importar Excel</strong> para enviar a planilha LNSA ou{" "}
              <strong>Novo processo</strong> para cadastrar manualmente.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 font-medium text-foreground">Nº Processo</th>
                  <th className="px-4 py-3 font-medium text-foreground">Status</th>
                  <th className="hidden px-4 py-3 font-medium text-foreground md:table-cell">Tipo / Fase</th>
                  <th className="px-4 py-3 font-medium text-foreground">Cliente</th>
                  <th className="hidden px-4 py-3 font-medium text-foreground lg:table-cell">Advogado</th>
                  <th className="hidden px-4 py-3 font-medium text-foreground lg:table-cell">Comarca / Vara</th>
                  <th className="px-4 py-3 font-medium text-foreground">Data prazo</th>
                  <th className="px-4 py-3 font-medium text-foreground">Data início</th>
                  <th className="px-4 py-3 font-medium text-foreground">Ações</th>
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
                        to={`/processos/${p.id}`}
                        className="block font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {p.numeroCnj}
                      </Link>
                      {p.tipoAcao && (
                        <div className="text-xs text-muted-foreground">{p.tipoAcao}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.status === "Encerrado"
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary/15 text-primary"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="text-muted-foreground">{p.tipo ?? "—"}</span>
                      {p.fase && <span className="block text-xs">{p.fase}</span>}
                    </td>
                    <td className="px-4 py-3 text-foreground">{p.nomeCliente ?? "—"}</td>
                    <td className="hidden px-4 py-3 lg:table-cell text-muted-foreground">
                      {p.nomeAdvogado ?? "—"}
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell text-muted-foreground">
                      {[p.comarca, p.vara].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatarData(p.dataPrazo)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatarData(p.dataInicio)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="text-sm text-primary hover:underline"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Novo/Editar Processo */}
      {modalProcesso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-foreground">
              {editing ? "Editar processo" : "Novo processo"}
            </h3>
            <form onSubmit={handleSubmitProcesso} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Número CNJ *</label>
                <input
                  name="numeroCnj"
                  defaultValue={editing?.numeroCnj}
                  required
                  readOnly={!!editing}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                  placeholder="Ex: 1024471-68.2021.8.26.0506"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <select
                    name="status"
                    defaultValue={editing?.status ?? "Ativo"}
                    className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Encerrado">Encerrado</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Cliente</label>
                  <select
                    name="idCliente"
                    defaultValue={processoParaEditar?.idCliente ?? ""}
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
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Advogado responsável</label>
                <select
                  name="idAdvogadoResponsavel"
                  defaultValue={processoParaEditar?.idAdvogadoResponsavel ?? ""}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Tipo ação</label>
                  <input
                    name="tipoAcao"
                    defaultValue={editing?.tipoAcao ?? ""}
                    className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Ex: Embargos à Execução"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Comarca</label>
                  <input
                    name="comarca"
                    defaultValue={String((editing as Record<string, unknown>)?.comarca ?? "")}
                    className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Data prazo</label>
                  <input
                    name="dataPrazo"
                    type="date"
                    defaultValue={(editing?.dataPrazo ?? "").toString().slice(0, 10)}
                    className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Data início</label>
                  <input
                    name="dataInicio"
                    type="date"
                    defaultValue={(editing?.dataInicio ?? "").toString().slice(0, 10)}
                    className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => { setModalProcesso(false); setEditing(null); }}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted/50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {editing ? "Salvar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Importar Excel */}
      {modalImportar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-foreground">Importar planilha Excel (LNSA)</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Envie a planilha completa. Serão importados clientes (Clie-F/Clie-J), processos (Proc-G) e movimentações (Proc-M) conforme as opções abaixo.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Arquivo .xlsx</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                  className="mt-1 block w-full text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">O que importar</label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={opcoesImport.importarClientes}
                    onChange={(e) =>
                      setOpcoesImport((o) => ({ ...o, importarClientes: e.target.checked }))
                    }
                  />
                  <span className="text-sm">Clientes (Clie-F e Clie-J)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={opcoesImport.importarProcessos}
                    onChange={(e) =>
                      setOpcoesImport((o) => ({ ...o, importarProcessos: e.target.checked }))
                    }
                  />
                  <span className="text-sm">Processos (Proc-G)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={opcoesImport.importarMovimentacoes}
                    onChange={(e) =>
                      setOpcoesImport((o) => ({ ...o, importarMovimentacoes: e.target.checked }))
                    }
                  />
                  <span className="text-sm">Movimentações (Proc-M)</span>
                </label>
              </div>
              {resultadoImport && (
                <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
                  <p className="font-medium text-foreground">{resultadoImport.message}</p>
                  <ul className="mt-2 list-inside list-disc text-muted-foreground">
                    <li>Clientes inseridos: {resultadoImport.clientesInseridos}</li>
                    <li>Processos inseridos: {resultadoImport.processosInseridos}</li>
                    <li>Processos atualizados: {resultadoImport.processosAtualizados}</li>
                    <li>Movimentações inseridas: {resultadoImport.movimentacoesInseridas}</li>
                  </ul>
                  {resultadoImport.erros.length > 0 && (
                    <div className="mt-2 text-destructive">
                      <p className="font-medium">Erros:</p>
                      <ul className="list-inside list-disc">
                        {resultadoImport.erros.slice(0, 10).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                        {resultadoImport.erros.length > 10 && (
                          <li>… e mais {resultadoImport.erros.length - 10} erros.</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setModalImportar(false); setResultadoImport(null); }}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted/50"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => importMutation.mutate()}
                disabled={!arquivo || importMutation.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {importMutation.isPending ? "Importando…" : "Importar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sincronizar Escavador */}
      {modalEscavador && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-foreground">Sincronizar Escavador</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Busca processos por OAB no Escavador e grava em dados para integração. Configure ESCAVADOR_API_KEY no servidor.
            </p>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">OAB UF</label>
                  <input
                    type="text"
                    value={escavadorOabUf}
                    onChange={(e) => setEscavadorOabUf(e.target.value)}
                    placeholder="Ex: SP"
                    maxLength={2}
                    className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">OAB Número</label>
                  <input
                    type="text"
                    value={escavadorOabNumero}
                    onChange={(e) => setEscavadorOabNumero(e.target.value)}
                    placeholder="Ex: 270074"
                    className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              {escavadorMutation.isError && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
                  {escavadorMutation.error?.message ?? "Erro ao sincronizar."}
                </div>
              )}
              {resultadoEscavador && resultadoEscavador.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
                  <p className="font-medium text-foreground">Resultado</p>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    {resultadoEscavador.map((r, i) => (
                      <li key={i}>
                        {r.advogado}: {r.erro ? r.erro : `${r.processados} processos gravados`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setModalEscavador(false); setResultadoEscavador(null); }}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted/50"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => escavadorMutation.mutate()}
                disabled={!escavadorOabUf.trim() || !escavadorOabNumero.trim() || escavadorMutation.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {escavadorMutation.isPending ? "Sincronizando…" : "Sincronizar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
