import { useNavigate } from "react-router-dom";
import { getUser, clearAuth } from "@/lib/auth";

export function Header() {
  const navigate = useNavigate();
  const user = getUser();

  function handleLogout() {
    clearAuth();
    navigate("/login", { replace: true });
  }

  const nomeExibicao = user?.pessoa
    ? `${user.pessoa.nome} ${user.pessoa.sobrenome}`
    : user?.login ?? "Usuário";

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <h1 className="text-sm font-medium text-primary lg:text-base">
        Sistema Jurídico Lourenço & Najm
      </h1>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          Bem-vindo, <span className="font-medium text-foreground">{nomeExibicao}</span>
        </span>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
