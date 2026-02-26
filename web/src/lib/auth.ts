const TOKEN_KEY = "agenda_prazos_token";
const USER_KEY = "agenda_prazos_user";

export type User = {
  id: number;
  login: string;
  perfil: string;
  grupo: string;
  idPessoa: number | null;
  pessoa: { id: number; nome: string; sobrenome: string } | null;
};

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isGestor(): boolean {
  const u = getUser();
  return u?.perfil === "gestor";
}

export function podeVerUsuarios(): boolean {
  return isGestor();
}

export function podeVerPessoas(): boolean {
  const u = getUser();
  return u?.perfil === "gestor" || u?.perfil === "administrativo";
}
