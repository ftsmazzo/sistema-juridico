/**
 * Extrai dados de uma publicação OAB a partir de uma imagem (print).
 * Suporta OpenAI Vision (gpt-4o, etc.) e Claude (Anthropic), com modelo selecionável.
 *
 * Variáveis de ambiente:
 * - OPENAI_API_KEY (para provider openai)
 * - ANTHROPIC_API_KEY (para provider claude)
 * - PUBLICACOES_PRINT_PROMPT (opcional: prompt customizado; substitui o padrão)
 */
import OpenAI from "openai";
import type { ItemPublicacaoOab } from "./publicacoes-oab.types.js";

export type ProvedorIa = "openai" | "claude";

/** Prompt alinhado ao usado no N8N: análise jurídica rica, resumo objetivo, observações úteis. */
const PROMPT_PADRAO = `Você é um assistente jurídico especializado em análise de publicações do Diário da Justiça (Recorte Digital OAB/SP).

Analise a IMAGEM (print ou foto da publicação) e extraia todas as informações visíveis. Retorne APENAS um objeto JSON válido, sem markdown, sem \`\`\`json, sem texto antes ou depois, com exatamente estas chaves:

- numeroProcesso (string, ex: 1000000-00.0000.0.00.0000)
- tipoPublicacao (string, ex: Intimação, Decisão, Citação, Despacho)
- vara (string)
- dataPublicacao (string, DD/MM/YYYY)
- dataDisponibilizacao (string, se aparecer na imagem)
- textoCompleto (string: transcreva o texto principal da publicação)
- jornal (string)
- local (string)
- resumo (string: duas a quatro frases objetivas para o advogado: (a) qual ato foi praticado; (b) o que a parte deve fazer, se houver; (c) prazo mencionado. Linguagem clara.)
- baseLegal (string: artigo/lei citado no texto, ex.: Art. 231 CPC. Vazio se não houver. Não invente.)
- prazoDiasUteisSugerido (number: dias úteis para cumprir o ato; 15 para intimações de contestar/manifestar quando não especificado; 0 se não houver prazo)
- observacoesIa (string: urgência, valor da causa, riscos como extinção/revelia, necessidade de documentos. Vazio se nada relevante.)
- movimentacoes (array de objetos { "tipo": string, "resumo": string }, ex.: [{ "tipo": "Intimação", "resumo": "Intimar as partes para apresentar contestação em 15 dias" }]. Se houver mais de um ato no texto, um objeto por ato.)

Use null para campos não encontrados. movimentacoes: [] se não houver.`;

type ExtracaoParsed = Partial<{
  numeroProcesso: string;
  tipoPublicacao: string;
  vara: string;
  dataPublicacao: string;
  dataDisponibilizacao: string;
  textoCompleto: string;
  jornal: string;
  local: string;
  resumo: string;
  baseLegal: string;
  prazoDiasUteisSugerido: number;
  observacoesIa: string;
  movimentacoes: { tipo: string; resumo: string }[];
}>;

function parseJsonFromResponse(text: string): ExtracaoParsed {
  let raw = text.trim();
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) raw = codeBlock[1].trim();
  return JSON.parse(raw) as ExtracaoParsed;
}

function normalizarBase64(imageBase64: string): { data: string; mediaType: string } {
  let base64Data = imageBase64.trim();
  let mediaType = "image/jpeg";
  if (base64Data.startsWith("data:")) {
    const match = base64Data.match(/^data:([^;]+);base64,/);
    if (match) {
      mediaType = match[1];
      const i = base64Data.indexOf(",");
      if (i !== -1) base64Data = base64Data.slice(i + 1);
    } else {
      const i = base64Data.indexOf(",");
      if (i !== -1) base64Data = base64Data.slice(i + 1);
    }
  }
  return { data: base64Data, mediaType };
}

function mapParsedToItem(parsed: ExtracaoParsed): Partial<ItemPublicacaoOab> {
  return {
    numeroProcesso: parsed.numeroProcesso ?? undefined,
    tipoPublicacao: parsed.tipoPublicacao ?? undefined,
    vara: parsed.vara ?? undefined,
    dataPublicacao: parsed.dataPublicacao ?? undefined,
    dataDisponibilizacao: parsed.dataDisponibilizacao ?? undefined,
    textoCompleto: parsed.textoCompleto ?? undefined,
    jornal: parsed.jornal ?? undefined,
    local: parsed.local ?? undefined,
    resumo: parsed.resumo ?? undefined,
    baseLegal: parsed.baseLegal ?? undefined,
    prazoDiasUteisSugerido: parsed.prazoDiasUteisSugerido ?? undefined,
    observacoesIa: parsed.observacoesIa ?? undefined,
    movimentacoes: Array.isArray(parsed.movimentacoes) ? parsed.movimentacoes : undefined,
  };
}

/** Extração via OpenAI Vision. */
async function extrairComOpenAI(
  base64Data: string,
  mediaType: string,
  prompt: string,
  model: string
): Promise<Partial<ItemPublicacaoOab>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY não configurada. Configure para usar extração por print com OpenAI.");
  }
  const openai = new OpenAI({ apiKey });
  const response = await openai.chat.completions.create({
    model,
    max_tokens: 2000,
    messages: [
      { role: "system", content: "Você retorna somente JSON válido, sem texto adicional." },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: { url: `data:${mediaType};base64,${base64Data}` },
          },
        ],
      },
    ],
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Resposta da IA vazia.");
  const parsed = parseJsonFromResponse(content);
  return mapParsedToItem(parsed);
}

/** Extração via Claude (Anthropic Messages API) com imagem em base64. */
async function extrairComClaude(
  base64Data: string,
  mediaType: string,
  prompt: string,
  model: string
): Promise<Partial<ItemPublicacaoOab>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY não configurada. Configure para usar extração por print com Claude.");
  }
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
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Data,
              },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
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
  if (!content) throw new Error("Resposta da Claude vazia.");
  const parsed = parseJsonFromResponse(content);
  return mapParsedToItem(parsed);
}

export type OpcoesExtracao = {
  provider?: ProvedorIa;
  model?: string;
};

/**
 * Recebe imagem em base64 (com ou sem prefixo data:image/...;base64,).
 * Opcionalmente provider ('openai' | 'claude') e model (ex.: gpt-4o, claude-sonnet-4-20250514).
 * Retorna objeto parcial para montar ItemPublicacaoOab.
 */
export async function extrairPublicacaoDeImagem(
  imageBase64: string,
  opcoes?: OpcoesExtracao
): Promise<Partial<ItemPublicacaoOab>> {
  const { data: base64Data, mediaType } = normalizarBase64(imageBase64);
  const prompt = process.env.PUBLICACOES_PRINT_PROMPT ?? PROMPT_PADRAO;
  const provider = opcoes?.provider ?? (process.env.OPENAI_API_KEY ? "openai" : "claude");
  const model =
    opcoes?.model ??
    (provider === "claude"
      ? process.env.CLAUDE_VISION_MODEL ?? "claude-sonnet-4-20250514"
      : process.env.OPENAI_VISION_MODEL ?? "gpt-4o");

  if (provider === "claude") {
    return extrairComClaude(base64Data, mediaType, prompt, model);
  }
  return extrairComOpenAI(base64Data, mediaType, prompt, model);
}
