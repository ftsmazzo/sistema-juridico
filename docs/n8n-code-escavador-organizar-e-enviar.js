/**
 * N8N Code Node: Organizar resposta da API Escavador (processos por OAB) e montar payload para a API Agenda Prazos.
 *
 * Entrada: 1 item com o body da resposta do Escavador (GET processos por OAB).
 * Resposta pode ser array com um objeto ou objeto direto: { advogado_encontrado, items, links, paginator }.
 *
 * NÃO use referência a outros nós (ex.: $('Set')) — isso gera erro "Referenced node doesn't exist".
 * OAB é extraída dos envolvidos na própria resposta.
 *
 * Saída: { advogado: { nome, oab_uf, oab_numero }, items: [ ... ] } para POST /api/dados-escavador.
 */

const input = $input.first().json;

// Resposta Escavador pode vir como array com um elemento ou como objeto direto
const data = Array.isArray(input) ? input[0] : input;
const advogadoEncontrado = data?.advogado_encontrado || {};
const items = Array.isArray(data?.items) ? data.items : [];

// OAB: extrair do primeiro envolvido com OAB na resposta (não referenciar outros nós)
let oabUf = '';
let oabNumero = '';
for (const item of items) {
  const fontes = item.fontes || [];
  for (const fonte of fontes) {
    const envolvidos = fonte.envolvidos || [];
    const adv = envolvidos.find((e) => e.oabs && e.oabs.length > 0);
    if (adv && adv.oabs && adv.oabs[0]) {
      oabUf = adv.oabs[0].uf || '';
      oabNumero = String(adv.oabs[0].numero || '');
      break;
    }
  }
  if (oabUf && oabNumero) break;
}

const advogado = {
  nome: advogadoEncontrado.nome || 'Advogado',
  oab_uf: oabUf,
  oab_numero: oabNumero,
};

function getFonteTribunal(item) {
  const fontes = item.fontes || [];
  return fontes.find((f) => f.tipo === 'TRIBUNAL' && f.capa) || fontes[0];
}

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : str;
}

const organizedItems = items.map((item) => {
  const fonte = getFonteTribunal(item);
  const capa = fonte?.capa || {};
  const valorCausa = capa.valor_causa;
  const unidade = item.unidade_origem || {};
  const processoPrincipal = (item.processos_relacionados || [])[0];

  let linkProcesso = null;
  for (const f of item.fontes || []) {
    if (f.url) {
      linkProcesso = f.url;
      break;
    }
  }

  return {
    numero_cnj: item.numero_cnj,
    data_inicio: parseDate(item.data_inicio),
    data_ultima_movimentacao: parseDate(item.data_ultima_movimentacao),
    data_ultima_verificacao: item.data_ultima_verificacao || null,
    tribunal_sigla: unidade.tribunal_sigla || fonte?.tribunal?.sigla || null,
    comarca: unidade.cidade || (capa.informacoes_complementares && capa.informacoes_complementares.find((i) => i.tipo === 'Jurisdição')?.valor) || null,
    vara: unidade.nome || capa.orgao_julgador || null,
    classe_processual: capa.classe || null,
    assunto_principal: capa.assunto_principal_normalizado?.path_completo || capa.assunto || null,
    area: capa.area || null,
    status_predito: fonte?.status_predito || null,
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

return [
  {
    json: {
      advogado,
      items: organizedItems,
      _meta: {
        total_items: organizedItems.length,
        next_page: data?.links?.next || null,
      },
    },
  },
];
