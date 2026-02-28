/**
 * Chama a API Escavador (processos por OAB), normaliza a resposta e retorna no formato
 * esperado por dados_escavador (para gravar ou para N8N).
 *
 * Requer ESCAVADOR_API_KEY no ambiente (Bearer token).
 */

import type { DadosEscavadorPayload } from "../routes/dados-escavador.js";

const ESCAVADOR_BASE = "https://api.escavador.com/api/v2";

/** Resposta bruta do GET /advogado/processos (pode vir array com 1 elem ou objeto) */
type EscavadorResponse = {
  advogado_encontrado?: { nome?: string; tipo?: string; quantidade_processos?: number };
  items?: EscavadorItem[];
  links?: { next?: string };
  paginator?: { per_page?: number };
};

type EscavadorItem = {
  numero_cnj?: string;
  titulo_polo_ativo?: string | null;
  titulo_polo_passivo?: string | null;
  data_inicio?: string | null;
  data_ultima_movimentacao?: string | null;
  data_ultima_verificacao?: string | null;
  unidade_origem?: {
    tribunal_sigla?: string;
    cidade?: string;
    nome?: string;
  };
  fontes?: Array<{
    tipo?: string;
    capa?: {
      valor_causa?: { valor?: string; valor_formatado?: string };
      orgao_julgador?: string;
      classe?: string;
      assunto?: string;
      assunto_principal_normalizado?: { path_completo?: string };
      area?: string;
      informacoes_complementares?: Array<{ tipo?: string; valor?: string }>;
    };
    tribunal?: { sigla?: string };
    status_predito?: string | null;
    segredo_justica?: boolean | null;
    url?: string;
    envolvidos?: Array<{ oabs?: Array<{ uf?: string; numero?: number }> }>;
  }>;
  processos_relacionados?: Array<{ numero?: string }>;
  quantidade_movimentacoes?: number | null;
};

function getFonteTribunal(item: EscavadorItem) {
  const fontes = item.fontes || [];
  return fontes.find((f) => f.tipo === "TRIBUNAL" && f.capa) || fontes[0];
}

function parseDateStr(str: string | null | undefined): string | null {
  if (!str || typeof str !== "string") return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : str;
}

function normalizeToken(token: string): string {
  let t = typeof token === "string" ? token.trim() : "";
  if (t.toLowerCase().startsWith("bearer ")) t = t.slice(7).trim();
  return t;
}

function parseResponseToPayload(
  data: EscavadorResponse,
  oabUfFallback: string,
  oabNumeroFallback: string
): { advogado: DadosEscavadorPayload["advogado"]; items: DadosEscavadorPayload["items"] } {
  const advogadoEncontrado = data?.advogado_encontrado || {};
  const items = Array.isArray(data?.items) ? data.items : [];
  let oabUf = oabUfFallback;
  let oabNumero = oabNumeroFallback;
  for (const item of items) {
    for (const fonte of item.fontes || []) {
      const adv = (fonte.envolvidos || []).find((e) => e.oabs?.length);
      if (adv?.oabs?.[0]) {
        oabUf = adv.oabs[0].uf || oabUfFallback;
        oabNumero = String(adv.oabs[0].numero ?? oabNumeroFallback);
        break;
      }
    }
    if (oabUf && oabNumero) break;
  }
  const advogado = {
    nome: advogadoEncontrado.nome || "Advogado",
    oab_uf: oabUf,
    oab_numero: oabNumero,
  };
  const organizedItems = items.map((item) => {
    const fonte = getFonteTribunal(item);
    const capa = fonte?.capa || {};
    const valorCausa = capa.valor_causa;
    const unidade = item.unidade_origem || {};
    const processoPrincipal = (item.processos_relacionados || [])[0];
    let linkProcesso: string | null = null;
    for (const f of item.fontes || []) {
      if (f.url) {
        linkProcesso = f.url;
        break;
      }
    }
    const jurisdição = capa.informacoes_complementares?.find((i) => i.tipo === "Jurisdição")?.valor;
    return {
      numero_cnj: item.numero_cnj || "",
      data_inicio: parseDateStr(item.data_inicio),
      data_ultima_movimentacao: parseDateStr(item.data_ultima_movimentacao),
      data_ultima_verificacao: item.data_ultima_verificacao || null,
      tribunal_sigla: unidade.tribunal_sigla || fonte?.tribunal?.sigla || null,
      comarca: unidade.cidade || jurisdição || null,
      vara: unidade.nome || capa.orgao_julgador || null,
      classe_processual: capa.classe || null,
      assunto_principal: capa.assunto_principal_normalizado?.path_completo || capa.assunto || null,
      area: capa.area || null,
      status_predito: fonte?.status_predito ?? null,
      titulo_polo_ativo: item.titulo_polo_ativo ?? null,
      titulo_polo_passivo: item.titulo_polo_passivo ?? null,
      valor_causa: valorCausa?.valor || valorCausa?.valor_formatado || null,
      quantidade_movimentacoes: item.quantidade_movimentacoes ?? null,
      segredo_justica: fonte?.segredo_justica ?? null,
      processo_principal_numero: processoPrincipal?.numero || null,
      link_processo: linkProcesso,
      payload_completo: item,
    };
  });
  return { advogado, items: organizedItems };
}

/**
 * Busca processos por OAB no Escavador e retorna payload normalizado.
 * Uma página por chamada (paginação pode ser feita pelo caller usando links.next).
 */
export async function buscarProcessosPorOab(
  oabUf: string,
  oabNumero: string,
  token: string
): Promise<DadosEscavadorPayload & { _meta?: { next_page?: string } }> {
  const tokenTrimmed = normalizeToken(token);
  if (!tokenTrimmed) {
    throw new Error("Token Escavador vazio. Verifique ESCAVADOR_API_KEY ou ESCAVADOR_TOKEN.");
  }
  const url = `${ESCAVADOR_BASE}/advogado/processos?oab_estado=${encodeURIComponent(oabUf)}&oab_numero=${encodeURIComponent(oabNumero)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${tokenTrimmed}`,
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Escavador API ${res.status}: ${text || res.statusText}`);
  }
  const raw = (await res.json()) as EscavadorResponse | EscavadorResponse[];
  const data: EscavadorResponse = Array.isArray(raw) ? raw[0] : raw;
  const { advogado, items } = parseResponseToPayload(data, oabUf, oabNumero);
  return {
    advogado,
    items,
    _meta: { next_page: data?.links?.next || undefined },
  };
}

/**
 * Busca todas as páginas de processos por OAB e retorna um único payload com todos os itens.
 * A API Escavador retorna em geral 20 itens por página (links.next para a próxima).
 */
export async function buscarTodasAsPaginasProcessosPorOab(
  oabUf: string,
  oabNumero: string,
  token: string
): Promise<DadosEscavadorPayload> {
  const tokenTrimmed = normalizeToken(token);
  if (!tokenTrimmed) {
    throw new Error("Token Escavador vazio. Verifique ESCAVADOR_API_KEY ou ESCAVADOR_TOKEN.");
  }
  const headers = {
    Authorization: `Bearer ${tokenTrimmed}`,
    "X-Requested-With": "XMLHttpRequest",
  };

  const firstUrl = `${ESCAVADOR_BASE}/advogado/processos?oab_estado=${encodeURIComponent(oabUf)}&oab_numero=${encodeURIComponent(oabNumero)}`;
  let nextUrl: string | null = firstUrl;
  let advogado: DadosEscavadorPayload["advogado"] = {
    nome: "Advogado",
    oab_uf: oabUf,
    oab_numero: oabNumero,
  };
  const allItems: DadosEscavadorPayload["items"] = [];

  while (nextUrl) {
    const res = await fetch(nextUrl, { method: "GET", headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Escavador API ${res.status}: ${text || res.statusText}`);
    }
    const raw = (await res.json()) as EscavadorResponse | EscavadorResponse[];
    const data: EscavadorResponse = Array.isArray(raw) ? raw[0] : raw;
    const parsed = parseResponseToPayload(data, oabUf, oabNumero);
    if (allItems.length === 0) advogado = parsed.advogado;
    allItems.push(...parsed.items);
    nextUrl = data?.links?.next || null;
  }

  return { advogado, items: allItems };
}
