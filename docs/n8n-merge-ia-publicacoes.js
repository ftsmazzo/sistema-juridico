// N8N Code Node: MergeEnriquecido
// Conecte DEPOIS do nó de IA (Anthropic/OpenAI). Entrada: saída da IA (Anthropic vem em content[0].text).
// Se o nó da IA não mesclar com a entrada, use Merge (Combine by position): entrada 1 = ExtraiPublicacao, entrada 2 = IA; depois este Code recebe os dois.
// Saída: um item por publicação com campos da publicação + resumo, baseLegal, prazoDiasUteisSugerido, observacoesIa, movimentacoes.

const items = $input.all();
const saida = [];

// Dados da publicação: vêm do ExtraiPublicacao (por índice) ou do próprio item se a IA tiver mesclado com a entrada
let publicacoes = [];
try {
  if (typeof $ === 'function' && $('ExtraiPublicacao')) publicacoes = $('ExtraiPublicacao').all();
} catch (_) {}
// Se o workflow usar Merge (Combine by position), o item pode ter input1 e input2
const useInput1 = items.length > 0 && items[0].json && (items[0].json.input1 !== undefined || items[0].json.input2 !== undefined);

function getTextFromItem(j) {
  if (!j) return '';
  if (typeof j.text === 'string') return j.text;
  if (j.message?.content) return typeof j.message.content === 'string' ? j.message.content : '';
  if (typeof j.output === 'string') return j.output;
  if (typeof j.result === 'string') return j.result;
  if (typeof j.reply === 'string') return j.reply;
  // Resposta da API Claude (Messages): body.content[].text
  const content = j.content || j.body?.content;
  if (Array.isArray(content) && content.length > 0) {
    const block = content.find((c) => c && c.type === 'text') || content[0];
    if (block && block.text) return block.text;
  }
  return '';
}

function parseIa(str) {
  if (typeof str !== 'string' || !str.trim()) return {};
  const cleaned = str.replace(/^```json?\s*|\s*```$/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    return {};
  }
}

for (let i = 0; i < items.length; i++) {
  const j = items[i].json || {};
  let pub = (publicacoes[i] && publicacoes[i].json) ? publicacoes[i].json : {};
  let raw = getTextFromItem(j);
  if (useInput1 && j.input1 && j.input2) {
    pub = j.input1.json || j.input1 || {};
    raw = getTextFromItem(j.input2.json || j.input2);
  } else if (j.emailId && j.numeroProcesso) {
    pub = j;
    raw = getTextFromItem(j);
  }
  const ia = parseIa(raw);
  const omitKeys = ['content', 'text', 'message', 'output', 'result', 'reply', 'input1', 'input2'];
  const base = Object.fromEntries(Object.entries(pub).filter(([k]) => !omitKeys.includes(k)));

  saida.push({
    json: {
      ...base,
      resumo: ia.resumo ?? base.resumo ?? null,
      baseLegal: ia.baseLegal ?? base.baseLegal ?? null,
      prazoDiasUteisSugerido: ia.prazoDiasUteisSugerido ?? base.prazoDiasUteisSugerido ?? null,
      observacoesIa: ia.observacoesIa ?? base.observacoesIa ?? null,
      movimentacoes: Array.isArray(ia.movimentacoes) ? ia.movimentacoes : (Array.isArray(base.movimentacoes) ? base.movimentacoes : null),
    },
  });
}

return saida;
