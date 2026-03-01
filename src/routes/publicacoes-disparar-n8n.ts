/**
 * POST /api/publicacoes/:id/disparar-analise-n8n
 * Envia a publicação para o webhook do N8N (final da automação) para rodar apenas a análise com IA.
 * Se o N8N devolver no response a análise (formato array com content[].text em JSON), o sistema
 * grava resumo, baseLegal, observacoesIa, movimentacoes, prazoDiasUteisSugerido na publicação.
 *
 * Requer: WEBHOOK_N8N_ANALISE_PUBLICACAO_URL (URL do webhook no N8N).
 * Requer autenticação.
 */
import { Response } from "express";
import type { RequestWithUser } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { publicacoesOab } from "../db/schema.js";
import { eq } from "drizzle-orm";

/** Trunca string para limite do varchar. */
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

/** Extrai e normaliza a análise do formato de resposta do N8N (array com content[].text = JSON). */
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

export async function dispararAnaliseN8n(
  req: RequestWithUser,
  res: Response<{ ok: boolean; message: string } | { error: string }>
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const url = process.env.WEBHOOK_N8N_ANALISE_PUBLICACAO_URL;
  if (!url || !url.trim()) {
    res.status(503).json({
      error:
        "Webhook N8N não configurado. Defina WEBHOOK_N8N_ANALISE_PUBLICACAO_URL com a URL do webhook no N8N.",
    });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [row] = await db
    .select()
    .from(publicacoesOab)
    .where(eq(publicacoesOab.id, id))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Publicação não encontrada" });
    return;
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
      res.status(502).json({
        error: `N8N respondeu ${response.status}. ${text.slice(0, 200) || ""}`,
      });
      return;
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      res.json({
        ok: true,
        message:
          "Enviado para análise no N8N. A resposta não veio em JSON; a publicação não foi atualizada.",
      });
      return;
    }

    const analise = extrairAnaliseDaRespostaN8n(body);
    if (analise) {
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

      if (Object.keys(update).length > 0) {
        await db.update(publicacoesOab).set(update).where(eq(publicacoesOab.id, id));
      }
      res.json({
        ok: true,
        message: "Análise recebida e gravada na publicação.",
      });
      return;
    }

    res.json({
      ok: true,
      message:
        "Enviado para análise no N8N. A resposta não continha análise em formato esperado; a publicação não foi alterada.",
    });
  } catch (err) {
    console.error("Disparar análise N8N:", err);
    res.status(502).json({
      error: err instanceof Error ? err.message : "Erro ao chamar o webhook N8N",
    });
  }
}
