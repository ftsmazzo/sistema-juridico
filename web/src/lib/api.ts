/**
 * Cliente HTTP para a API Agenda Prazos.
 * Base URL: VITE_API_URL em dev, ou mesmo host em produção (proxy /api).
 */

import { getToken } from "./auth";

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  return "";
};

export const api = {
  baseUrl: getBaseUrl(),

  async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = path.startsWith("http") ? path : `${this.baseUrl}${path}`;
    const token = getToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(url, {
      ...options,
      headers,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    const contentType = res.headers.get("content-type");
    if (contentType?.includes("application/json")) return res.json() as Promise<T>;
    return undefined as T;
  },

  get<T>(path: string) {
    return this.request<T>(path, { method: "GET" });
  },

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(path: string) {
    return this.request<T>(path, { method: "DELETE" });
  },
};

/** Health check da API */
export function healthCheck() {
  return api.get<{ ok: boolean; service: string }>("/health");
}

export type DashboardTotais = {
  publicacoes: number;
  prazos: number;
  prazosPendentes: number;
  processos: number;
};

export type ProximoPrazo = {
  id: number;
  prazo: string;
  data: string;
  tipo: string;
  numeroProcesso: string | null;
  status: number;
};

export type SugestaoIa = {
  id: number;
  publicacaoOabId: number;
  numeroProcesso: string | null;
  resumo: string | null;
  observacoesIa: string;
  createdAt: string;
};

export type DashboardResponse = {
  totais: DashboardTotais;
  proximosPrazos: ProximoPrazo[];
  sugestoesIa: SugestaoIa[];
};

/** Dados do dashboard (totais, próximos prazos, sugestões da IA) */
export function getDashboard() {
  return api.get<DashboardResponse>("/api/dashboard");
}

export type PrazoListItem = {
  id: number;
  prazo: string;
  data: string;
  tipo: string;
  status: number;
  numeroProcesso: string | null;
  observacao: string | null;
};

/** Lista publicações OAB (mais recentes primeiro). limit opcional (default 50, máx 200). */
export type PublicacaoListItem = {
  id: number;
  subject: string | null;
  dataPublicacao: string | null;
  tipoPublicacao: string | null;
  numeroProcesso: string | null;
  vara: string | null;
  resumo: string | null;
  createdAt: string;
};

export function getPublicacoes(limit?: number) {
  const q = limit != null ? `?limit=${limit}` : "";
  return api.get<PublicacaoListItem[]>(`/api/publicacoes${q}`);
}

export type PublicacaoDetalhe = {
  id: number;
  emailId: string;
  subject: string | null;
  dateEmail: string | null;
  fromEmail: string | null;
  toEmail: string | null;
  advogadoPrincipal: string | null;
  numeroOab: string | null;
  dataProcessamento: string | null;
  totalPublicacoes: number | null;
  publicacaoNumero: number;
  dataDisponibilizacao: string | null;
  dataPublicacao: string | null;
  jornal: string | null;
  pagina: string | null;
  caderno: string | null;
  local: string | null;
  vara: string | null;
  tipoPublicacao: string | null;
  numeroProcesso: string | null;
  valorMencionado: string | null;
  textoCompleto: string | null;
  advogados: { nome: string; oab: string }[] | null;
  poloAtivo: string | null;
  polosPassivos: string[] | null;
  urlDocumento: string | null;
  identificadorDocumento: string | null;
  resumo: string | null;
  baseLegal: string | null;
  prazoDiasUteisSugerido: number | null;
  observacoesIa: string | null;
  movimentacoes: { tipo: string; resumo: string }[] | null;
  createdAt: string;
};

export function getPublicacao(id: number) {
  return api.get<PublicacaoDetalhe>(`/api/publicacoes/${id}`);
}

export function updatePublicacao(
  id: number,
  body: Partial<PublicacaoDetalhe>
) {
  return api.patch<PublicacaoDetalhe>(`/api/publicacoes/${id}`, body);
}

/** Cadastra publicação a partir de imagem (print). Extração por IA no backend. */
export type PublicacaoPorPrintResponse = {
  publicacaoId: number;
  prazoIds: number[];
  message: string;
};

export function cadastrarPublicacaoPorPrint(imageBase64: string) {
  return api.post<PublicacaoPorPrintResponse>("/api/publicacoes/por-print", {
    image: imageBase64,
  });
}

/** Lista prazos com filtros: inicio, fim (YYYY-MM-DD), status (0=pendente), tipo */
export function getPrazos(params: {
  inicio?: string;
  fim?: string;
  status?: number | "";
  tipo?: string;
}) {
  const sp = new URLSearchParams();
  if (params.inicio) sp.set("inicio", params.inicio);
  if (params.fim) sp.set("fim", params.fim);
  if (params.status !== undefined && params.status !== "") sp.set("status", String(params.status));
  if (params.tipo) sp.set("tipo", params.tipo);
  const q = sp.toString();
  return api.get<PrazoListItem[]>(`/api/prazos${q ? `?${q}` : ""}`);
}

// --- Auth ---
export type LoginResponse = {
  token: string;
  user: import("./auth").User;
};

export function login(login: string, senha: string) {
  return api.post<LoginResponse>("/api/auth/login", { login, senha });
}

// --- Pessoas ---
export type PessoaListItem = {
  id: number;
  nome: string;
  sobrenome: string;
  email: string | null;
  celular: string | null;
  tipo: string;
  numeroOab: string | null;
  ativo: boolean;
};

export function getPessoas(params?: { q?: string; ativo?: string }) {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.ativo) sp.set("ativo", params.ativo);
  const q = sp.toString();
  return api.get<PessoaListItem[]>(`/api/pessoas${q ? `?${q}` : ""}`);
}

export function createPessoa(body: {
  nome: string;
  sobrenome: string;
  email?: string;
  celular?: string;
  tipo?: string;
  numeroOab?: string;
}) {
  return api.post<PessoaListItem>("/api/pessoas", body);
}

export function updatePessoa(
  id: number,
  body: Partial<Omit<PessoaListItem, "id">>
) {
  return api.patch<PessoaListItem>(`/api/pessoas/${id}`, body);
}

// --- Usuários ---
export type UsuarioListItem = {
  id: number;
  login: string;
  perfil: string;
  ativo: boolean;
  idPessoa: number | null;
  pessoa: { id: number; nome: string; sobrenome: string } | null;
};

/** Usuário com dados completos da pessoa (para edição). */
export type UsuarioComPessoa = UsuarioListItem & {
  pessoa: {
    id: number;
    nome: string;
    sobrenome: string;
    email: string | null;
    celular: string | null;
    tipo: string;
    numeroOab: string | null;
  } | null;
};

export function getUsuarios(params?: { q?: string }) {
  const q = params?.q ? `?q=${encodeURIComponent(params.q)}` : "";
  return api.get<UsuarioListItem[]>(`/api/usuarios${q}`);
}

export function getUsuario(id: number) {
  return api.get<UsuarioComPessoa>(`/api/usuarios/${id}`);
}

export function createUsuario(body: {
  nome: string;
  sobrenome: string;
  email?: string;
  celular?: string;
  tipo?: string;
  numeroOab?: string;
  login: string;
  senha: string;
  perfil?: string;
}) {
  return api.post<UsuarioListItem>("/api/usuarios", body);
}

export function updateUsuario(
  id: number,
  body: {
    nome?: string;
    sobrenome?: string;
    email?: string;
    celular?: string;
    tipo?: string;
    numeroOab?: string;
    perfil?: string;
    ativo?: boolean;
    senha?: string;
  }
) {
  return api.patch<UsuarioListItem>(`/api/usuarios/${id}`, body);
}

// --- Admin (apenas Gestor) ---
export function limparDados() {
  return api.post<{ ok: boolean; message: string }>("/api/admin/limpar-dados");
}
