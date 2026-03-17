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

export type SemMovimentacaoBucket = {
  totalProcessos: number;
  totalPrazos: number;
};

export type AgrupamentoSemMovimentacao = {
  semInformacao: SemMovimentacaoBucket;
  dias30: SemMovimentacaoBucket;
  dias60: SemMovimentacaoBucket;
  dias90: SemMovimentacaoBucket;
  dias120Mais: SemMovimentacaoBucket;
};

export type DashboardResponse = {
  totais: DashboardTotais;
  proximosPrazos: ProximoPrazo[];
  sugestoesIa: SugestaoIa[];
  agrupamentoSemMovimentacao: AgrupamentoSemMovimentacao;
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

export type PrazoSubtarefaItem = {
  id: number;
  titulo: string;
  concluida: boolean;
  ordem: number;
};

export type PrazoDetalhe = {
  id: number;
  prazo: string;
  data: string;
  tipo: string;
  status: number;
  numeroProcesso: string | null;
  observacao: string | null;
  conteudo: string | null;
  resumoPublicacao: string | null;
  movimentacaoTipo: string | null;
  resumoMovimentacao: string | null;
  publicacaoOabId: number | null;
  processoId: number | null;
  subtarefas: PrazoSubtarefaItem[];
};

export function getPrazoById(id: number) {
  return api.get<PrazoDetalhe>(`/api/prazos/${id}`);
}

export function createSubtarefa(prazoId: number, titulo: string) {
  return api.post<PrazoSubtarefaItem>(`/api/prazos/${prazoId}/subtarefas`, { titulo });
}

export function updateSubtarefa(
  prazoId: number,
  idItem: number,
  data: { titulo?: string; concluida?: boolean }
) {
  return api.patch<PrazoSubtarefaItem>(`/api/prazos/${prazoId}/subtarefas/${idItem}`, data);
}

export function deleteSubtarefa(prazoId: number, idItem: number) {
  return api.delete<{ ok: boolean }>(`/api/prazos/${prazoId}/subtarefas/${idItem}`);
}

/** Sugere itens de checklist com base na publicação e no processo (IA). */
export function sugerirSubtarefas(prazoId: number) {
  return api.post<{ ok: boolean; itens: { titulo: string }[] }>(
    `/api/prazos/${prazoId}/sugerir-subtarefas`
  );
}

/** Lista publicações OAB (mais recentes primeiro). limit opcional (default 50, máx 200). */
export type PublicacaoListItem = {
  id: number;
  subject: string | null;
  dataPublicacao: string | null;
  dateEmail: string | null;
  tipoPublicacao: string | null;
  numeroProcesso: string | null;
  vara: string | null;
  oabs: string | null;
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

/** Dispara a análise com IA no N8N (webhook). N8N atualiza a publicação via PATCH depois. */
export function dispararAnaliseN8n(id: number) {
  return api.post<{ ok: boolean; message: string }>(
    `/api/publicacoes/${id}/disparar-analise-n8n`
  );
}

/** Configuração do monitoramento de e-mail (IMAP). Uma conta. */
export type EmailMonitorConfig = {
  id: number;
  nome: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  remetentesFiltro: string[];
  intervalMinutes: number;
  lastCheckedAt: string | null;
  lastError: string | null;
  ativo: boolean;
  /** True enquanto a verificação está rodando no servidor (continua após F5). */
  checkingInProgress?: boolean;
  /** ID do usuário vinculado (para notificação WhatsApp). */
  idUsuario: number | null;
  /** OAB do advogado da conta (alternativa para notificação). */
  numeroOab: string | null;
  createdAt: string;
  updatedAt: string;
};

export function getEmailMonitorConfig() {
  return api.get<EmailMonitorConfig>("/api/email-monitor/config");
}

/** Lista todas as contas de e-mail. */
export function listContasEmail() {
  return api.get<EmailMonitorConfig[]>("/api/email-monitor/contas");
}

export function getContaEmail(id: number) {
  return api.get<EmailMonitorConfig>(`/api/email-monitor/contas/${id}`);
}

export function createContaEmail(body: Partial<EmailMonitorConfig> & { password: string }) {
  return api.post<EmailMonitorConfig>("/api/email-monitor/contas", body);
}

export function updateContaEmail(
  id: number,
  body: Partial<EmailMonitorConfig> & { password?: string }
) {
  return api.put<EmailMonitorConfig>(`/api/email-monitor/contas/${id}`, body);
}

export function deleteContaEmail(id: number) {
  return api.delete<{ ok: boolean }>(`/api/email-monitor/contas/${id}`);
}

export function putEmailMonitorConfig(body: Partial<EmailMonitorConfig> & { password?: string }) {
  return api.put<EmailMonitorConfig>("/api/email-monitor/config", body);
}

/** Verifica uma conta específica ou a primeira ativa. dias: opcional, ex. 30 para forçar últimos 30 dias. */
export function postVerificarAgora(contaId?: number, dias?: number) {
  const body: { contaId?: number; dias?: number } = {};
  if (contaId != null) body.contaId = contaId;
  if (dias != null && dias > 0) body.dias = Number(dias);
  return api.post<{
    ok: boolean;
    publicacoesCriadas: number;
    prazosCriados: number;
    emailsProcessados: number;
  }>("/api/email-monitor/verificar-agora", body);
}

/** Cadastra publicação(ões) a partir de imagem (print). Extração por IA no backend. */
export type PublicacaoPorPrintResponse = {
  publicacaoId: number;
  publicacaoIds: number[];
  prazoIds: number[];
  message: string;
};

export type ProvedorIa = "openai" | "claude";

/** Modelos disponíveis por provedor (para seleção na tela de print). */
export const MODELOS_IA = {
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o mini" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  ],
  claude: [
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
    { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
  ],
} as const;

export function cadastrarPublicacaoPorPrint(
  imageBase64: string,
  opcoes?: { provider?: ProvedorIa; model?: string }
) {
  return api.post<PublicacaoPorPrintResponse>("/api/publicacoes/por-print", {
    image: imageBase64,
    ...(opcoes?.provider && { provider: opcoes.provider }),
    ...(opcoes?.model && { model: opcoes.model }),
  });
}

/** Teste do pipeline de e-mail Recorte: cola o corpo do e-mail → extrai + IA + grava */
export type EmailMonitorTestResponse = {
  ok: boolean;
  publicacoesExtraidas: number;
  publicacoesGravadas: number;
  prazosCriados: number;
  publicacaoIds: number[];
  prazoIds: number[];
  erros?: string[];
};

export function testarEmailMonitor(body: {
  emailText?: string;
  emailHtml?: string;
  subject?: string;
  from?: string;
  to?: string;
}) {
  return api.post<EmailMonitorTestResponse>("/api/email-monitor/test", body);
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

/** Retorna a URL de inscrição do calendário (meus prazos); gera token se não existir. */
export function getLinkInscricaoCalendario() {
  return api.get<{ url: string; totalPrazos: number }>("/api/prazos/link-inscricao");
}

/**
 * Faz o download do arquivo .ics com os prazos do usuário (requer login).
 * Params opcionais: inicio, fim (YYYY-MM-DD) para filtrar pelo mês.
 */
export async function downloadPrazosIcs(params?: { inicio?: string; fim?: string }) {
  const sp = new URLSearchParams();
  if (params?.inicio) sp.set("inicio", params.inicio);
  if (params?.fim) sp.set("fim", params.fim);
  const q = sp.toString();
  const path = `/api/prazos/export.ics${q ? `?${q}` : ""}`;
  const url = path.startsWith("http") ? path : `${api.baseUrl}${path}`;
  const token = getToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "prazos.ics";
  a.click();
  URL.revokeObjectURL(a.href);
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

// --- Clientes ---
export type ClienteListItem = {
  id: number;
  tipo: string;
  nome: string;
  razaoSocial: string | null;
  cpf: string | null;
  cnpj: string | null;
  cidade: string | null;
  estado: string | null;
  ativo: boolean;
};

export function getClientes(params?: { q?: string; tipo?: string }) {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.tipo) sp.set("tipo", params.tipo);
  const q = sp.toString();
  return api.get<ClienteListItem[]>(`/api/clientes${q ? `?${q}` : ""}`);
}

export function getCliente(id: number) {
  return api.get<ClienteListItem & Record<string, unknown>>(`/api/clientes/${id}`);
}

export function createCliente(body: Record<string, unknown>) {
  return api.post<ClienteListItem>("/api/clientes", body);
}

export function updateCliente(id: number, body: Record<string, unknown>) {
  return api.patch<ClienteListItem>(`/api/clientes/${id}`, body);
}

// --- Processos ---
export type ProcessoListItem = {
  id: number;
  numeroCnj: string;
  status: string;
  tipo: string | null;
  fase: string | null;
  tipoAcao: string | null;
  nomeCliente: string | null;
  nomeAdvogado: string | null;
  comarca: string | null;
  vara: string | null;
  dataPrazo: string | null;
  dataInicio: string | null;
  dataUltimaMovimentacao: string | null;
};

export type ProcessoListResponse = {
  items: ProcessoListItem[];
  total: number;
  page: number;
  perPage: number;
};

export type ProcessoDetalhe = ProcessoListItem & {
  idCliente: number | null;
  idAdvogadoResponsavel: number | null;
  cliente: Record<string, unknown> | null;
  advogado: { id: number; nomeCompleto: string; login: string } | null;
  movimentacoes: { id: number; ordem: number; movimentacao: string | null; dataMovimentacao: string | null }[];
  movimentacoesFromPublicacoes: {
    id: number;
    tipo: string;
    resumo: string | null;
    ordem: number;
    fonte: string;
    dataLimite: string | null;
    publicacaoOabId: number;
  }[];
  prazosVinculados: { id: number; prazo: string; data: string; status: number }[];
  publicacoesVinculadas: { id: number; subject: string | null; tipoPublicacao: string | null; dataPublicacao: string | null }[];
  totalPrazos: number;
  totalPublicacoes: number;
  [key: string]: unknown;
};

export function getProcessos(params?: {
  q?: string;
  status?: string;
  idCliente?: number;
  idAdvogado?: number;
  page?: number;
  semMovimentacao?: "sem-info" | "30" | "60" | "90" | "120-mais";
}) {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.status) sp.set("status", params.status);
  if (params?.idCliente != null) sp.set("idCliente", String(params.idCliente));
  if (params?.idAdvogado != null) sp.set("idAdvogado", String(params.idAdvogado));
  if (params?.page != null && params.page >= 1) sp.set("page", String(params.page));
  if (params?.semMovimentacao) sp.set("semMovimentacao", params.semMovimentacao);
  const q = sp.toString();
  return api.get<ProcessoListResponse>(`/api/processos${q ? `?${q}` : ""}`);
}

export function enriquecerProcessosEscavador() {
  return api.post<{ updated: number; message: string }>("/api/processos/enriquecer-escavador");
}

export function getProcesso(id: number) {
  return api.get<ProcessoDetalhe>(`/api/processos/${id}`);
}

export function popularMovimentacoesPublicacoes(processoId: number) {
  return api.post<{ inseridas: number; message: string }>(
    `/api/processos/${processoId}/popular-movimentacoes-publicacoes`
  );
}

export function popularMovimentacoesEscavador(processoId: number) {
  return api.post<{ inseridas: number; message: string }>(
    `/api/processos/${processoId}/popular-movimentacoes-escavador`
  );
}

export function createProcesso(body: Record<string, unknown>) {
  return api.post<ProcessoListItem>("/api/processos", body);
}

export function updateProcesso(id: number, body: Record<string, unknown>) {
  return api.patch<ProcessoListItem>(`/api/processos/${id}`, body);
}

export type ResultadoImportacao = {
  message: string;
  clientesInseridos: number;
  processosInseridos: number;
  processosAtualizados: number;
  movimentacoesInseridas: number;
  erros: string[];
};

export function importarExcelProcessos(
  fileBase64: string,
  opcoes?: { importarClientes?: boolean; importarProcessos?: boolean; importarMovimentacoes?: boolean }
) {
  return api.post<ResultadoImportacao>("/api/processos/importar-excel", {
    fileBase64,
    ...opcoes,
  });
}

// --- Dados Escavador (sincronizar por OAB e listar gravados) ---
export type DadosEscavadorListItem = {
  id: number;
  numeroCnj: string;
  advogadoNome: string | null;
  advogadoOabUf: string | null;
  advogadoOabNumero: string | null;
  tituloPoloAtivo: string | null;
  tituloPoloPassivo: string | null;
  dataInicio: string | null;
  dataUltimaMovimentacao: string | null;
  comarca: string | null;
  vara: string | null;
  createdAt: string;
};

export type SincronizarEscavadorResultado = {
  oab_uf: string;
  oab_numero: string;
  processados: number;
  total_items: number;
  advogado: string;
  erro?: string;
};

export function getDadosEscavador(params?: { oab_uf?: string; oab_numero?: string }) {
  const sp = new URLSearchParams();
  if (params?.oab_uf) sp.set("oab_uf", params.oab_uf);
  if (params?.oab_numero) sp.set("oab_numero", params.oab_numero);
  const q = sp.toString();
  return api.get<DadosEscavadorListItem[]>(`/api/dados-escavador${q ? `?${q}` : ""}`);
}

export function sincronizarDadosEscavador(body: { oab_uf: string; oab_numero: string } | { advogados: Array<{ oab_uf: string; oab_numero: string }> }) {
  return api.post<{ ok: boolean; resultados: SincronizarEscavadorResultado[] }>(
    "/api/dados-escavador/sincronizar",
    body
  );
}

// --- Admin (apenas Gestor) ---
export function limparDados() {
  return api.post<{ ok: boolean; message: string }>("/api/admin/limpar-dados");
}
