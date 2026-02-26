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
      <div className="w-full max-w-sm space-y-8 rounded-2xl border border-border bg-card p-8 shadow-lg">
        <div className="flex flex-col items-center text-center">
          <img
            src="/logo.png"
            alt="Lourenço & Najm"
            className="h-28 w-full max-w-[300px] object-contain"
          />
          <p className="mt-4 text-base text-muted-foreground">
            Entre com seu usuário para acessar o sistema.
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {erro && (
            <p className="rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erro}
            </p>
          )}
          <div>
            <label
              htmlFor="login"
              className="block text-sm font-medium text-foreground"
            >
              Login
            </label>
            <input
              id="login"
              type="text"
              value={loginVal}
              onChange={(e) => setLoginVal(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="seu.login"
              autoComplete="username"
            />
          </div>
          <div>
            <label
              htmlFor="senha"
              className="block text-sm font-medium text-foreground"
            >
              Senha
            </label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
        {import.meta.env.DEV && (
          <p className="text-center text-xs text-muted-foreground">
            <Link to="/dashboard" className="underline hover:text-foreground">
              Acessar sem login (dev)
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
