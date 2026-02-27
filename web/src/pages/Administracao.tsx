import { useState } from "react";
import { Link } from "react-router-dom";
import { limparDados } from "@/lib/api";
import { isGestor } from "@/lib/auth";

export function Administracao() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmar, setConfirmar] = useState(false);

  async function handleLimparDados() {
    if (!confirmar) {
      setError("Marque a confirmação para prosseguir.");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await limparDados();
      setSuccess(res.message ?? "Dados limpos com sucesso.");
      setConfirmar(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao limpar dados.");
    } finally {
      setLoading(false);
    }
  }

  if (!isGestor()) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground">Administração</h2>
        <p className="text-muted-foreground">Acesso restrito a Gestores.</p>
        <Link to="/dashboard" className="text-sm text-primary underline hover:no-underline">
          ← Voltar ao Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Administração
        </h2>
        <p className="mt-1 text-muted-foreground">
          Ações de manutenção para desenvolvimento e produção.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="font-medium text-foreground">Limpar dados</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Zera <strong>prazos</strong>, <strong>publicações OAB</strong>,{" "}
          <strong>audiências</strong> e <strong>agenda</strong>. Mantém usuários e
          pessoas. Use em ambiente de testes ou para reiniciar em produção.
        </p>
        {error && (
          <p className="mt-3 rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-3 rounded bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
            {success}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={confirmar}
              onChange={(e) => setConfirmar(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm">Confirmo que quero zerar esses dados</span>
          </label>
          <button
            type="button"
            onClick={handleLimparDados}
            disabled={loading || !confirmar}
            className="rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
          >
            {loading ? "Limpando…" : "Limpar dados"}
          </button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        <Link to="/dashboard" className="underline hover:text-foreground">
          ← Voltar ao Dashboard
        </Link>
      </p>
    </div>
  );
}
