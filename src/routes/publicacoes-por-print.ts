import { Response } from "express";
import type { RequestWithUser } from "../middleware/auth.js";
import type { ItemPublicacaoOab } from "../lib/publicacoes-oab.types.js";
import { extrairPublicacaoDeImagem } from "../lib/extrair-publicacao-por-ia.js";
import { processarItemPublicacaoOab } from "../lib/processar-publicacao-oab.js";

/**
 * POST /api/publicacoes/por-print
 * Body: { image: string } (base64 da imagem, com ou sem prefixo data:image/...;base64,)
 * Requer autenticação. Extrai dados com IA e grava publicação + análise + prazos.
 */
export async function publicacaoPorPrint(
  req: RequestWithUser,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const body = req.body as { image?: string };
  const image = body?.image;
  if (!image || typeof image !== "string") {
    res.status(400).json({ error: "Envie a imagem em base64 no campo 'image'." });
    return;
  }

  try {
    const extracted = await extrairPublicacaoDeImagem(image);
    const emailId = `print-${req.user.id}-${Date.now()}`;
    const publicacaoNumero = 1;

    const item: ItemPublicacaoOab = {
      emailId,
      isRecorteDigital: true,
      publicacaoNumero,
      numeroProcesso: extracted.numeroProcesso,
      tipoPublicacao: extracted.tipoPublicacao,
      vara: extracted.vara,
      dataPublicacao: extracted.dataPublicacao,
      dataDisponibilizacao: extracted.dataDisponibilizacao,
      textoCompleto: extracted.textoCompleto,
      jornal: extracted.jornal,
      local: extracted.local,
      resumo: extracted.resumo,
      baseLegal: extracted.baseLegal,
      prazoDiasUteisSugerido: extracted.prazoDiasUteisSugerido,
      observacoesIa: extracted.observacoesIa,
      movimentacoes: extracted.movimentacoes,
    };

    const result = await processarItemPublicacaoOab(item);
    if (result.skipped) {
      res.status(409).json({
        error: "Publicação duplicada ou já existente.",
        skipped: result.skipped,
      });
      return;
    }
    if (!result.publicacaoId) {
      res.status(500).json({ error: "Falha ao gravar publicação." });
      return;
    }

    res.status(201).json({
      publicacaoId: result.publicacaoId,
      prazoIds: result.prazoIds ?? [],
      message: "Publicação cadastrada com sucesso.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao processar imagem.";
    console.error("Publicação por print:", err);
    if (message.includes("OPENAI_API_KEY")) {
      res.status(503).json({
        error: "Serviço de extração por IA não configurado. Configure OPENAI_API_KEY.",
      });
      return;
    }
    res.status(500).json({ error: message });
  }
}
