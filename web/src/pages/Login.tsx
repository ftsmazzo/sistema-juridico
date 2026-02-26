import { Link } from "react-router-dom";

export function Login() {
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
        <form className="space-y-4">
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
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="seu.login"
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
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>
          <button
            type="button"
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Entrar
          </button>
        </form>
        <p className="text-center text-xs text-muted-foreground">
          <Link to="/dashboard" className="underline hover:text-foreground">
            Acessar sem login (dev)
          </Link>
        </p>
      </div>
    </div>
  );
}
