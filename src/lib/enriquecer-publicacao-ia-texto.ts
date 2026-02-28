/**
 * Enriquece uma publicação (Recorte Digital) com análise por IA em TEXTO.
 * Usa o mesmo prompt do N8N (docs/n8n-prompt-ia-publicacoes.txt) para preservar
 * a qualidade da resposta da automação (melhor que a IA do print por imagem).
 *
 * Variáveis de ambiente: OPENAI_API_KEY ou ANTHROPIC_API_KEY.
 */
import OpenAI from "openai";
import type { ItemPublicacaoOab } from "./publicacoes-oab.types.js";

const PROMPT_N8N = `Você é um assistente que analisa publicações do Diário da Justiça (Recorte Digital OAB) e devolve um JSON estruturado.

Entrada que você recebe:
- textoCompleto: texto integral da publicação
- tipoPublicacao: tipo já identificado (ex.: Intimação, Despacho)
- numeroProcesso, dataPublicacao, vara

Tarefa: analise o texto e devolva APENAS um JSON válido (sem markdown, sem texto antes ou depois), com exatamente estes campos:

{
  "resumo": "Uma ou duas frases resumindo o ato e o que as partes devem fazer, se houver.",
  "baseLegal": "Artigo e lei aplicável ao prazo, se houver (ex.: Art. 231 CPC). Vazio se não couber.",
  "prazoDiasUteisSugerido": número em dias úteis para cumprir o ato, ou 0 se não houver prazo,
  "observacoesIa": "Qualquer observação relevante (urgência, valor, prazos internos no texto). Vazio se não houver.",
  "movimentacoes": [ { "tipo": "Nome do ato (ex.: Intimação, Decisão, Recebimento)", "resumo": "Resumo em uma linha" } ]
}

Regras:
- movimentacoes: se no mesmo texto houver mais de um ato (ex.: "Recebo os embargos... REJEITO os embargos. Intime-se"), liste cada um. Se for só uma intimação, um único elemento.
- prazoDiasUteisSugerido: intimação para contestar/manifestar costuma ser 15 dias úteis; ajuste se o texto disser outro prazo.
- baseLegal: só preencha se souber o artigo (ex.: CPC, CLT). Não invente.

Texto da publicação para analisar:

---
textoCompleto: {{TEXTO_COMPLETO}}
tipoPublicacao: {{TIPO_PUBLICACAO}}
numeroProcesso: {{NUMERO_PROCESSO}}
dataPublicacao: {{DATA_PUBLICACAO}}
vara: {{VARA}}
---

Responda somente com o JSON.`;

export type EnriquecimentoIa = {
  resumo?: string | null;
  baseLegal?: string | null;
  prazoDiasUteisSugerido?: number | null;
  observacoesIa?: string | null;
  movimentacoes?: { tipo: string; resumo: string }[] | null;
};

function parseJsonFromIaResponse(text: string): EnriquecimentoIa {
  let raw = (text || "").trim();
  raw = raw.replace(/^```json?\s*|\s*```$/g, "").trim();
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      resumo: typeof parsed.resumo === "string" ? parsed.resumo : null,
      baseLegal: typeof parsed.baseLegal === "string" ? parsed.baseLegal : null,
      prazoDiasUteisSugerido:
        typeof parsed.prazoDiasUteisSugerido === "number"
          ? parsed.prazoDiasUteisSugerido
          : null,
      observacoesIa: typeof parsed.observacoesIa === "string" ? parsed.observacoesIa : null,
      movimentacoes: Array.isArray(parsed.movimentacoes)
        ? (parsed.movimentacoes as { tipo?: string; resumo?: string }[]).map((m) => ({
            tipo: typeof m.tipo === "string" ? m.tipo : "",
            resumo: typeof m.resumo === "string" ? m.resumo : "",
          }))
        : null,
    };
  } catch {
    return {};
  }
}

function buildPrompt(item: ItemPublicacaoOab): string {
  return PROMPT_N8N.replace(/\{\{TEXTO_COMPLETO\}\}/g, (item.textoCompleto ?? "").slice(0, 15000))
    .replace(/\{\{TIPO_PUBLICACAO\}\}/g, item.tipoPublicacao ?? "")
    .replace(/\{\{NUMERO_PROCESSO\}\}/g, item.numeroProcesso ?? "")
    .replace(/\{\{DATA_PUBLICACAO\}\}/g, item.dataPublicacao ?? "")
    .replace(/\{\{VARA\}\}/g, item.vara ?? "");
}

async function enriquecerComOpenAI(
  prompt: string,
  model: string
): Promise<EnriquecimentoIa> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada.");
  const openai = new OpenAI({ apiKey });
  const response = await openai.chat.completions.create({
    model,
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });
  const content = response.choices[0]?.message?.content;
  if (!content) return {};
  return parseJsonFromIaResponse(content);
}

async function enriquecerComClaude(
  prompt: string,
  model: string
): Promise<EnriquecimentoIa> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada.");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API: ${response.status} ${errText || response.statusText}`);
  }
  const json = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const block = json.content?.find((c) => c?.type === "text");
  const content = block?.text;
  if (!content) return {};
  return parseJsonFromIaResponse(content);
}

export type OpcoesEnriquecer = {
  provider?: "openai" | "claude";
  model?: string;
};

/**
 * Enriquece um item de publicação com resumo, baseLegal, prazoDiasUteisSugerido, observacoesIa, movimentacoes.
 * Usa o mesmo prompt do N8N (análise por texto) para manter a qualidade da automação.
 */
export async function enriquecerPublicacaoComIaTexto(
  item: ItemPublicacaoOab,
  opcoes?: OpcoesEnriquecer
): Promise<EnriquecimentoIa> {
  const prompt = buildPrompt(item);
  const provider =
    opcoes?.provider ??
    (process.env.OPENAI_API_KEY ? "openai" : "claude");
  const model =
    opcoes?.model ??
    (provider === "claude"
      ? process.env.CLAUDE_VISION_MODEL ?? "claude-sonnet-4-20250514"
      : process.env.OPENAI_VISION_MODEL ?? "gpt-4o");

  if (provider === "claude") {
    return enriquecerComClaude(prompt, model);
  }
  return enriquecerComOpenAI(prompt, model);
}

/**
 * Mescla o enriquecimento IA no item (como o MergeEnriquecido do N8N).
 */
export function mesclarEnriquecimentoNoItem(
  item: ItemPublicacaoOab,
  enriquecimento: EnriquecimentoIa
): ItemPublicacaoOab {
  return {
    ...item,
    resumo: enriquecimento.resumo ?? item.resumo,
    baseLegal: enriquecimento.baseLegal ?? item.baseLegal,
    prazoDiasUteisSugerido:
      enriquecimento.prazoDiasUteisSugerido ?? item.prazoDiasUteisSugerido,
    observacoesIa: enriquecimento.observacoesIa ?? item.observacoesIa,
    movimentacoes: enriquecimento.movimentacoes ?? item.movimentacoes,
  };
}
