/**
 * Lógica compartilhada: enviar publicação ao webhook N8N, extrair análise da resposta,
 * gravar na publicação e criar prazos. Usado pela rota do botão "Análise com IA" e pelo
 * email-monitor ao criar publicações a partir do e-mail.
 */
import { db } from "../db/index.js";
import { publicacoesOab } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { criarPrazosAPartirDePublicacao } from "./processar-publicacao-oab.js";

function v(s: string | null | undefined, max: number): string | null {
  if (s == null || s === "") return null;
  const t = String(s).trim();
  return t.length > max ? t.slice(0, max) : t;
}

type AnalisePayload = {
  resumo?: string | null;
  baseLegal?: string | null;
  prazoDiasUteisSugerido?: number | null;
  observacoesIa?: string | null;
  movimentacoes?: { tipo: string; resumo: string }[] | null;
};

function extrairAnaliseDaRespostaN8n(body: unknown): AnalisePayload | null {
  if (!Array.isArray(body) || body.length === 0) return null;
  const first = body[0] as { content?: Array<{ type?: string; text?: string }> };
  const content = first?.content;
  if (!Array.isArray(content) || content.length === 0) return null;
  const textBlock = content[0];
  if (textBlock?.type !== "text" || typeof textBlock.text !== "string") return null;
  let raw = textBlock.text.trim();
  if (!raw) return null;
  raw = raw.replace(/^```json?\s*|\s*```$/g, "").trim();
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      resumo: typeof parsed.resumo === "string" ? parsed.resumo : null,
      baseLegal: typeof parsed.baseLegal === "string" ? v(parsed.baseLegal, 255) : null,
      prazoDiasUteisSugerido:
        typeof parsed.prazoDiasUteisSugerido === "number" ? parsed.prazoDiasUteisSugerido : null,
      observacoesIa: typeof parsed.observacoesIa === "string" ? parsed.observacoesIa : null,
      movimentacoes: Array.isArray(parsed.movimentacoes)
        ? (parsed.movimentacoes as { tipo?: string; resumo?: string }[]).map((m) => ({
            tipo: typeof m.tipo === "string" ? m.tipo : "",
            resumo: typeof m.resumo === "string" ? m.resumo : "",
          }))
        : null,
    };
  } catch {
    return null;
  }
}

export type ResultadoAnaliseN8n = {
  ok: boolean;
  analiseGravada: boolean;
  prazosCriados: number;
  erro?: string;
};

/**
 * Envia a publicação ao webhook N8N, extrai a análise da resposta e grava na publicação + cria prazos.
 */
export async function executarAnaliseN8nParaPublicacao(
  publicacaoId: number
): Promise<ResultadoAnaliseN8n> {
  const url = process.env.WEBHOOK_N8N_ANALISE_PUBLICACAO_URL;
  if (!url || !url.trim()) {
    return { ok: false, analiseGravada: false, prazosCriados: 0, erro: "Webhook N8N não configurado" };
  }

  const [row] = await db
    .select()
    .from(publicacoesOab)
    .where(eq(publicacoesOab.id, publicacaoId))
    .limit(1);

  if (!row) {
    return { ok: false, analiseGravada: false, prazosCriados: 0, erro: "Publicação não encontrada" };
  }

  const payload = {
    publicacaoId: row.id,
    emailId: row.emailId,
    subject: row.subject,
    from: row.fromEmail,
    to: row.toEmail,
    advogado: row.advogadoPrincipal,
    numeroOab: row.numeroOab,
    dataProcessamento: row.dataProcessamento,
    totalPublicacoes: row.totalPublicacoes,
    publicacaoNumero: row.publicacaoNumero,
    dataDisponibilizacao: row.dataDisponibilizacao,
    dataPublicacao: row.dataPublicacao,
    jornal: row.jornal,
    pagina: row.pagina,
    caderno: row.caderno,
    local: row.local,
    vara: row.vara,
    tipoPublicacao: row.tipoPublicacao,
    numeroProcesso: row.numeroProcesso,
    valorMencionado: row.valorMencionado,
    textoCompleto: row.textoCompleto,
    advogados: row.advogados,
    poloAtivo: row.poloAtivo,
    polosPassivos: row.polosPassivos,
    urlDocumento: row.urlDocumento,
    identificadorDocumento: row.identificadorDocumento,
    isRecorteDigital: true,
  };

  try {
    const response = await fetch(url.trim(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const text = await response.text();
      return {
        ok: false,
        analiseGravada: false,
        prazosCriados: 0,
        erro: `N8N respondeu ${response.status}. ${text.slice(0, 200) || ""}`,
      };
    }

    let bodyRes: unknown;
    try {
      bodyRes = await response.json();
    } catch {
      return { ok: true, analiseGravada: false, prazosCriados: 0 };
    }

    const analise = extrairAnaliseDaRespostaN8n(bodyRes);
    if (!analise) {
      return { ok: true, analiseGravada: false, prazosCriados: 0 };
    }

    const update: {
      resumo?: string | null;
      baseLegal?: string | null;
      prazoDiasUteisSugerido?: number | null;
      observacoesIa?: string | null;
      movimentacoes?: { tipo: string; resumo: string }[] | null;
    } = {};
    if (analise.resumo !== undefined) update.resumo = analise.resumo;
    if (analise.baseLegal !== undefined) update.baseLegal = analise.baseLegal;
    if (analise.prazoDiasUteisSugerido !== undefined)
      update.prazoDiasUteisSugerido = analise.prazoDiasUteisSugerido;
    if (analise.observacoesIa !== undefined) update.observacoesIa = analise.observacoesIa;
    if (analise.movimentacoes !== undefined) update.movimentacoes = analise.movimentacoes;

    if (Object.keys(update).length === 0) {
      return { ok: true, analiseGravada: false, prazosCriados: 0 };
    }

    await db.update(publicacoesOab).set(update).where(eq(publicacoesOab.id, publicacaoId));
    const { prazoIds } = await criarPrazosAPartirDePublicacao(publicacaoId);
    return {
      ok: true,
      analiseGravada: true,
      prazosCriados: prazoIds?.length ?? 0,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Executar análise N8N para publicação:", publicacaoId, err);
    return {
      ok: false,
      analiseGravada: false,
      prazosCriados: 0,
      erro: msg,
    };
  }
}
