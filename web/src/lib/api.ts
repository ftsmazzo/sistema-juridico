/**
 * Cliente HTTP para a API Agenda Prazos.
 * Base URL: VITE_API_URL em dev, ou mesmo host em produção (proxy /api).
 */

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
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
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
