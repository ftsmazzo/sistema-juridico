import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { testarEmailMonitor } from "@/lib/api";

export function TestarEmailRecorte() {
  const queryClient = useQueryClient();
  const [emailText, setEmailText] = useState("");
  const [subject, setSubject] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      testarEmailMonitor({
        emailText: emailText.trim() || undefined,
        emailHtml: emailText.trim() || undefined,
        subject: subject.trim() || undefined,
        from: from.trim() || undefined,
        to: to.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publicacoes"] });
      queryClient.invalidateQueries({ queryKey: ["prazos"] });
    },
  });

  const result = mutation.data;
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailText.trim()) {
      mutation.reset();
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to="/publicacoes" className="text-sm text-primary hover:underline">
          ← Publicações
        </Link>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Testar e-mail Recorte Digital
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cole abaixo o corpo de um e-mail do Recorte Digital OAB/SP. O sistema extrai as
          publicações, enriquece com IA (mesmo prompt da automação) e grava. Sem N8N, sem
          Postman.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground">
            Corpo do e-mail (texto ou HTML) *
          </label>
          <textarea
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            placeholder="Cole aqui o conteúdo do e-mail (copie do seu cliente de e-mail ou do N8N)..."
            className="mt-1 min-h-[240px] w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Assunto</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Recorte Digital OAB/SP..."
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground">De</label>
            <input
              type="text"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="oabsp@recortedigital..."
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Para</label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="seu@email.com"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!emailText.trim() || mutation.isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {mutation.isPending ? "Processando…" : "Processar e-mail"}
          </button>
          <Link to="/publicacoes" className="text-sm text-muted-foreground hover:underline">
            Cancelar
          </Link>
        </div>
      </form>

      {mutation.isError && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-4 text-destructive">
          <p className="font-medium">Erro</p>
          <p className="mt-1 text-sm">
            {mutation.error?.message ?? "Não foi possível processar o e-mail."}
          </p>
        </div>
      )}

      {result && (
        <div
          className={`rounded-xl border p-4 ${
            result.ok
              ? "border-primary/40 bg-primary/5"
              : "border-amber-500/40 bg-amber-500/5"
          }`}
        >
          <p className="font-medium text-foreground">
            {result.ok ? "Processado com sucesso" : "Processado com avisos"}
          </p>
          <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
            <li>Publicações extraídas: {result.publicacoesExtraidas}</li>
            <li>Publicações gravadas: {result.publicacoesGravadas}</li>
            <li>Prazos criados: {result.prazosCriados}</li>
          </ul>
          {result.publicacaoIds?.length > 0 && (
            <p className="mt-2 text-sm">
              {result.publicacaoIds.length === 1 ? (
                <Link
                  to={`/publicacoes/${result.publicacaoIds[0]}`}
                  className="text-primary hover:underline"
                >
                  Ver publicação →
                </Link>
              ) : (
                <Link to="/publicacoes" className="text-primary hover:underline">
                  Ver todas as publicações →
                </Link>
              )}
            </p>
          )}
          {result.erros && result.erros.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-sm text-amber-700 dark:text-amber-400">
              {result.erros.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
