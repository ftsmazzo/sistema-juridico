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
import { executarAnaliseN8nParaPublicacao } from "../lib/analise-n8n-publicacao.js";

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

  const result = await executarAnaliseN8nParaPublicacao(id);
  if (!result.ok && result.erro) {
    res.status(502).json({ error: result.erro });
    return;
  }
  if (result.analiseGravada) {
    res.json({ ok: true, message: "Análise recebida e gravada na publicação." });
    return;
  }
  res.json({
    ok: true,
    message:
      "Enviado para análise no N8N. A resposta não continha análise em formato esperado; a publicação não foi alterada.",
  });
}
