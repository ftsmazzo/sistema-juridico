import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "@/lib/api";
import { setAuth } from "@/lib/auth";

export function Login() {
  const navigate = useNavigate();
  const [loginVal, setLoginVal] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!loginVal.trim() || !senha) {
      setErro("Preencha login e senha.");
      return;
    }
    setLoading(true);
    try {
      const res = await login(loginVal.trim(), senha);
      setAuth(res.token, res.user);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Credenciais inválidas.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-8 rounded-2xl border border-white/10 bg-[var(--sidebar-bg)] p-8 shadow-lg">
        <div className="flex flex-col items-center text-center">
          <img
            src="/logo.png"
            alt="Lourenço & Najm"
            className="h-28 w-full max-w-[300px] object-contain"
          />
          <p className="mt-4 text-lg font-medium text-white">
            Sistema Jurídico
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {erro && (
            <p className="rounded bg-red-500/20 px-3 py-2 text-sm text-red-200">
              {erro}
            </p>
          )}
          <div>
            <label
              htmlFor="login"
              className="block text-sm font-medium text-white/90"
            >
              Login
            </label>
            <input
              id="login"
              type="text"
              value={loginVal}
              onChange={(e) => setLoginVal(e.target.value)}
              className="mt-1 block w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
              placeholder="seu.login"
              autoComplete="username"
            />
          </div>
          <div>
            <label
              htmlFor="senha"
              className="block text-sm font-medium text-white/90"
            >
              Senha
            </label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="mt-1 block w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-white px-4 py-2 text-sm font-medium text-[var(--sidebar-bg)] hover:bg-white/95 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
        {import.meta.env.DEV && (
          <p className="text-center text-xs text-white/70">
            <Link to="/dashboard" className="underline hover:text-white">
              Acessar sem login (dev)
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
