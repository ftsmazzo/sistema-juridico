import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getEmailMonitorConfig,
  putEmailMonitorConfig,
  postVerificarAgora,
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

export function MonitoramentoEmail() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<EmailMonitorConfig> & { password?: string }>({});
  const [remetentesText, setRemetentesText] = useState("");

  const { data: config, isPending } = useQuery({
    queryKey: ["email-monitor-config"],
    queryFn: getEmailMonitorConfig,
  });

  useEffect(() => {
    if (config) {
      setForm({
        nome: config.nome,
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.user,
        intervalMinutes: config.intervalMinutes,
        ativo: config.ativo,
      });
      setRemetentesText(
        Array.isArray(config.remetentesFiltro) ? config.remetentesFiltro.join("\n") : ""
      );
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const remetentesFiltro = remetentesText
        .split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      return putEmailMonitorConfig({
        ...form,
        remetentesFiltro,
        password: form.password || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-monitor-config"] });
      setForm((f) => ({ ...f, password: undefined }));
    },
  });

  const verificarMutation = useMutation({
    mutationFn: postVerificarAgora,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-monitor-config"] });
    },
  });

  const handleSave = () => saveMutation.mutate();
  const handleVerificarAgora = () => verificarMutation.mutate();

  if (isPending || !config) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando configuração…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Monitoramento de e-mail</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure a conta IMAP (Yahoo, OAB, etc.). O sistema verifica automaticamente e cria
          publicações; use o botão &quot;Análise com IA&quot; na publicação para enviar ao N8N e
          gerar prazos.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-foreground">Status</h2>
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Última verificação</p>
            <p className="text-sm font-medium text-foreground">
              {formatarData(config.lastCheckedAt)}
            </p>
          </div>
          {config.lastError && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">Último erro</p>
              <p className="truncate text-sm text-destructive">{config.lastError}</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleVerificarAgora}
            disabled={verificarMutation.isPending || !config.host || !config.user}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {verificarMutation.isPending ? "Verificando…" : "Verificar agora"}
          </button>
        </div>
        {verificarMutation.isSuccess && verificarMutation.data && (
          <p className="mt-3 text-sm text-muted-foreground">
            {verificarMutation.data.emailsProcessados} e-mail(s) lidos,{" "}
            {verificarMutation.data.publicacoesCriadas} publicação(ões) criada(s).
          </p>
        )}
        {verificarMutation.isError && (
          <p className="mt-3 text-sm text-destructive">
            {verificarMutation.error instanceof Error ? verificarMutation.error.message : "Erro"}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-foreground">Conta de e-mail</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Nome</label>
            <input
              type="text"
              value={form.nome ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Conta principal"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground">Host IMAP</label>
              <input
                type="text"
                value={form.host ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="imap.exemplo.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground">Porta</label>
              <input
                type="number"
                value={form.port ?? 993}
                onChange={(e) => setForm((f) => ({ ...f, port: parseInt(e.target.value, 10) || 993 }))}
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
              Conexão segura (SSL/TLS)
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
              Senha {config.id ? "(deixe em branco para manter a atual)" : ""}
            </label>
            <input
              type="password"
              value={form.password ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground">
              Remetentes a monitorar (um por linha; vazio = todos)
            </label>
            <textarea
              value={remetentesText}
              onChange={(e) => setRemetentesText(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
              rows={3}
              placeholder="recortedigital@adv.br
@oabsp.org.br"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground">
              Verificar automaticamente a cada (minutos)
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
              Conta ativa (verificação automática ligada)
            </label>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending || !form.host?.trim() || !form.user?.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saveMutation.isPending ? "Salvando…" : "Salvar configuração"}
          </button>
        </div>
        {saveMutation.isError && (
          <p className="mt-3 text-sm text-destructive">
            {saveMutation.error instanceof Error ? saveMutation.error.message : "Erro ao salvar"}
          </p>
        )}
        {saveMutation.isSuccess && (
          <p className="mt-3 text-sm text-green-600 dark:text-green-400">Configuração salva.</p>
        )}
      </section>
    </div>
  );
}
