import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listContasEmail,
  getContaEmail,
  createContaEmail,
  updateContaEmail,
  deleteContaEmail,
  postVerificarAgora,
  getUsuarios,
  type EmailMonitorConfig,
} from "@/lib/api";

function formatarData(iso: string | null) {
  if (!iso) return "Nunca";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const INTERVAL_LABELS: Record<number, string> = {
  5: "5 min",
  10: "10 min",
  15: "15 min",
  30: "30 min",
  60: "1 h",
};

type FormState = Partial<EmailMonitorConfig> & { password?: string };

export function MonitoramentoEmail() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>({});
  const [remetentesText, setRemetentesText] = useState("");
  const [verificandoId, setVerificandoId] = useState<number | null>(null);
  const [resultadoId, setResultadoId] = useState<number | null>(null);
  const [resultadoMsg, setResultadoMsg] = useState<string | null>(null);

  const { data: contas = [], isPending } = useQuery({
    queryKey: ["email-monitor-contas"],
    queryFn: listContasEmail,
  });

  const { data: contaEdit } = useQuery({
    queryKey: ["email-monitor-conta", editingId],
    queryFn: () => getContaEmail(editingId!),
    enabled: editingId != null,
  });

  const { data: usuariosList = [] } = useQuery({
    queryKey: ["usuarios"],
    queryFn: () => getUsuarios(),
  });

  useEffect(() => {
    if (contaEdit) {
      setForm({
        nome: contaEdit.nome,
        host: contaEdit.host,
        port: contaEdit.port,
        secure: contaEdit.secure,
        user: contaEdit.user,
        intervalMinutes: contaEdit.intervalMinutes,
        ativo: contaEdit.ativo,
        idUsuario: contaEdit.idUsuario ?? undefined,
        numeroOab: contaEdit.numeroOab ?? undefined,
      });
      setRemetentesText(
        Array.isArray(contaEdit.remetentesFiltro) ? contaEdit.remetentesFiltro.join("\n") : ""
      );
    }
  }, [contaEdit]);

  const createMutation = useMutation({
    mutationFn: (body: FormState & { password: string }) => {
      const remetentesFiltro = remetentesText
        .split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      return createContaEmail({ ...body, remetentesFiltro });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-monitor-contas"] });
      setModalOpen(false);
      setForm({});
      setRemetentesText("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (id: number) => {
      const remetentesFiltro = remetentesText
        .split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      return updateContaEmail(id, { ...form, remetentesFiltro, password: form.password });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-monitor-contas"] });
      setModalOpen(false);
      setEditingId(null);
      setForm({});
      setRemetentesText("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteContaEmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-monitor-contas"] });
    },
  });

  const verificarMutation = useMutation({
    mutationFn: (contaId: number) => postVerificarAgora(contaId),
    onMutate: (contaId) => setVerificandoId(contaId),
    onSettled: () => setVerificandoId(null),
    onSuccess: (data, contaId) => {
      queryClient.invalidateQueries({ queryKey: ["email-monitor-contas"] });
      setResultadoId(contaId);
      setResultadoMsg(
        `${data.emailsProcessados} e-mail(s), ${data.publicacoesCriadas} publicação(ões) criada(s).`
      );
      setTimeout(() => {
        setResultadoId(null);
        setResultadoMsg(null);
      }, 5000);
    },
  });

  const handleOpenNew = () => {
    setEditingId(null);
    setForm({
      nome: "Nova conta",
      host: "",
      port: 993,
      secure: true,
      user: "",
      intervalMinutes: 15,
      ativo: true,
      idUsuario: undefined,
      numeroOab: undefined,
    });
    setRemetentesText("");
    setModalOpen(true);
  };

  const handleOpenEdit = (c: EmailMonitorConfig) => {
    setEditingId(c.id);
    setForm({
      nome: c.nome,
      host: c.host,
      port: c.port,
      secure: c.secure,
      user: c.user,
      intervalMinutes: c.intervalMinutes,
      ativo: c.ativo,
      idUsuario: c.idUsuario ?? undefined,
      numeroOab: c.numeroOab ?? undefined,
    });
    setRemetentesText(Array.isArray(c.remetentesFiltro) ? c.remetentesFiltro.join("\n") : "");
    setModalOpen(true);
  };

  const handleSave = () => {
    if (editingId != null) {
      updateMutation.mutate(editingId);
    } else {
      if (!form.password?.trim()) return;
      createMutation.mutate({ ...form, password: form.password } as FormState & { password: string });
    }
  };

  if (isPending) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-muted-foreground">Carregando contas…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Monitoramento de e-mail</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie várias contas IMAP (ex.: adrianolms@yahoo.com.br). Use o botão &quot;Yahoo&quot; ao editar para preencher host/porta. Yahoo exige senha de app — veja{" "}
            <a href="https://help.yahoo.com/kb/new-yahoo-mail/imap-server-settings-yahoo-mail-sln4075.html" target="_blank" rel="noopener noreferrer" className="text-primary underline">configuração Yahoo</a>.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenNew}
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Nova conta
        </button>
      </div>

      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 font-medium text-foreground">Nome</th>
                <th className="px-4 py-3 font-medium text-foreground">Host / Usuário</th>
                <th className="px-4 py-3 font-medium text-foreground">Intervalo</th>
                <th className="px-4 py-3 font-medium text-foreground">Última verificação</th>
                <th className="px-4 py-3 font-medium text-foreground">Status</th>
                <th className="px-4 py-3 font-medium text-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {contas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhuma conta configurada. Clique em &quot;Nova conta&quot; para adicionar.
                  </td>
                </tr>
              ) : (
                contas.map((c) => (
                  <tr key={c.id} className="border-b border-border/60">
                    <td className="px-4 py-3 font-medium text-foreground">{c.nome}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.host} · {c.user}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {INTERVAL_LABELS[c.intervalMinutes] ?? `${c.intervalMinutes} min`}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatarData(c.lastCheckedAt)}
                    </td>
                    <td className="px-4 py-3">
                      {c.lastError ? (
                        <span className="truncate max-w-[180px] block text-destructive" title={c.lastError}>
                          Erro
                        </span>
                      ) : c.ativo ? (
                        <span className="text-green-600 dark:text-green-400">Ativa</span>
                      ) : (
                        <span className="text-muted-foreground">Inativa</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => verificarMutation.mutate(c.id)}
                          disabled={verificandoId != null || !c.host || !c.user}
                          className="rounded border border-border bg-muted/50 px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
                        >
                          {verificandoId === c.id ? "Verificando…" : "Verificar agora"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(c)}
                          className="rounded border border-border bg-muted/50 px-2 py-1 text-xs font-medium hover:bg-muted"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Excluir a conta "${c.nome}"?`))
                              deleteMutation.mutate(c.id);
                          }}
                          disabled={deleteMutation.isPending}
                          className="rounded border border-destructive/50 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        >
                          Excluir
                        </button>
                      </div>
                      {resultadoId === c.id && resultadoMsg && (
                        <p className="mt-1 text-xs text-muted-foreground">{resultadoMsg}</p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <h2 className="mb-4 font-semibold text-foreground">
              {editingId != null ? "Editar conta" : "Nova conta"}
            </h2>
            {contaEdit?.lastError && (
              <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <strong>Último erro na verificação:</strong> {contaEdit.lastError}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground">Nome</label>
                <input
                  type="text"
                  value={form.nome ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Ex: OAB Recorte"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground">Host IMAP</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      value={form.host ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
                      className="block flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                      placeholder="imap.exemplo.com"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          host: "imap.mail.yahoo.com",
                          port: 993,
                          secure: true,
                        }))
                      }
                      className="shrink-0 rounded border border-border bg-muted/50 px-2 py-1.5 text-xs font-medium hover:bg-muted"
                    >
                      Yahoo
                    </button>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Yahoo: use o botão e senha de app (não a senha normal)
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground">Porta</label>
                  <input
                    type="number"
                    value={form.port ?? 993}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, port: parseInt(e.target.value, 10) || 993 }))
                    }
                    className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="secure"
                  checked={form.secure !== false}
                  onChange={(e) => setForm((f) => ({ ...f, secure: e.target.checked }))}
                  className="rounded border-border"
                />
                <label htmlFor="secure" className="text-sm text-muted-foreground">
                  SSL/TLS
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground">E-mail (usuário)</label>
                <input
                  type="text"
                  value={form.user ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, user: e.target.value }))}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder="seu@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground">
                  Senha {editingId != null ? "(deixe em branco para manter)" : ""}
                </label>
                <input
                  type="password"
                  value={form.password ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                {(form.host ?? "").toLowerCase().includes("yahoo") && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    Yahoo exige senha de app. Gere em: Conta Yahoo → Segurança → Senhas de app. Use essa senha aqui, não a senha normal.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground">
                  Remetentes (um por linha; vazio = todos)
                </label>
                <textarea
                  value={remetentesText}
                  onChange={(e) => setRemetentesText(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                  rows={2}
                  placeholder="@recortedigital.adv.br"
                />
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Vazio = processa todos os e-mails (incluindo encaminhados). Preencha só se quiser filtrar por remetente.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground">
                    Usuário (notificação WhatsApp)
                  </label>
                  <select
                    value={form.idUsuario ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        idUsuario: e.target.value === "" ? undefined : parseInt(e.target.value, 10),
                      }))
                    }
                    className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Nenhum</option>
                    {usuariosList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.pessoa ? `${u.pessoa.nome} ${u.pessoa.sobrenome}` : u.login}
                      </option>
                    ))}
                  </select>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Celular do usuário será usado no envio
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground">
                    OAB (alternativa)
                  </label>
                  <input
                    type="text"
                    value={form.numeroOab ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, numeroOab: e.target.value.trim() || undefined }))
                    }
                    className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Ex: 270074 ou 270074/SP"
                  />
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Se não escolher usuário, busca por OAB
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground">
                  Verificar a cada
                </label>
                <select
                  value={form.intervalMinutes ?? 15}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, intervalMinutes: parseInt(e.target.value, 10) }))
                  }
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value={5}>5 minutos</option>
                  <option value={10}>10 minutos</option>
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={60}>1 hora</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={form.ativo !== false}
                  onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                  className="rounded border-border"
                />
                <label htmlFor="ativo" className="text-sm text-muted-foreground">
                  Conta ativa (verificação automática)
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setEditingId(null);
                  setForm({});
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={
                  (editingId != null ? updateMutation.isPending : createMutation.isPending) ||
                  !form.host?.trim() ||
                  !form.user?.trim() ||
                  (editingId == null && !form.password?.trim())
                }
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {editingId != null
                  ? updateMutation.isPending
                    ? "Salvando…"
                    : "Salvar"
                  : createMutation.isPending
                    ? "Criando…"
                    : "Criar conta"}
              </button>
            </div>
            {(createMutation.isError || updateMutation.isError) && (
              <p className="mt-3 text-sm text-destructive">
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : updateMutation.error instanceof Error
                    ? updateMutation.error.message
                    : "Erro"}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
