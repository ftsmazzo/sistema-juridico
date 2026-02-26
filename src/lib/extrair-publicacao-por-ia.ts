/**
 * Extrai dados de uma publicação OAB a partir de uma imagem (print)
 * usando OpenAI Vision (gpt-4o). Retorna um objeto compatível com ItemPublicacaoOab.
 *
 * Variável de ambiente: OPENAI_API_KEY
 * Você pode substituir o prompt abaixo pelo que usa no N8N (env PUBLICACOES_PRINT_PROMPT).
 */
import OpenAI from "openai";
import type { ItemPublicacaoOab } from "./publicacoes-oab.types.js";

const PROMPT_PADRAO = `Você é um assistente que extrai dados de publicações jurídicas brasileiras (Diário da Justiça, Recorte Digital OAB, intimações, decisões).
Analise a imagem e retorne APENAS um objeto JSON válido, sem markdown, sem \`\`\`json, com as chaves:
- numeroProcesso (string, ex: 1000000-00.0000.0.00.0000)
- tipoPublicacao (string, ex: Intimação, Decisão, Citação)
- vara (string)
- dataPublicacao (string, formato DD/MM/YYYY)
- dataDisponibilizacao (string, se diferente)
- textoCompleto (string, texto principal da publicação)
- jornal (string)
- local (string)
- resumo (string, resumo objetivo)
- baseLegal (string, artigo/lei quando aplicável)
- prazoDiasUteisSugerido (number, 15 para intimações quando não especificado)
- observacoesIa (string, observações relevantes)
- movimentacoes (array de objetos { tipo: string, resumo: string }, ex: [{ "tipo": "Intimação", "resumo": "Intimar as partes para..." }])

Use null para campos não encontrados. Para movimentacoes use [] se não houver.`;

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

/**
 * Recebe imagem em base64 (com ou sem prefixo data:image/...;base64,).
 * Retorna objeto parcial para montar ItemPublicacaoOab (sem emailId, publicacaoNumero, isRecorteDigital).
 */
export async function extrairPublicacaoDeImagem(
  imageBase64: string
): Promise<Partial<ItemPublicacaoOab>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY não configurada. Configure para usar cadastro por print.");
  }

  let base64Data = imageBase64.trim();
  if (base64Data.startsWith("data:")) {
    const i = base64Data.indexOf(",");
    if (i !== -1) base64Data = base64Data.slice(i + 1);
  }

  const prompt = process.env.PUBLICACOES_PRINT_PROMPT ?? PROMPT_PADRAO;
  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_VISION_MODEL ?? "gpt-4o",
    max_tokens: 2000,
    messages: [
      {
        role: "system",
        content: "Você retorna somente JSON válido, sem texto adicional.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Data}`,
            },
          },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Resposta da IA vazia.");
  }

  const parsed = parseJsonFromResponse(content);
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
