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

  const body = req.body as {
    image?: string;
    provider?: "openai" | "claude";
    model?: string;
  };
  const image = body?.image;
  if (!image || typeof image !== "string") {
    res.status(400).json({ error: "Envie a imagem em base64 no campo 'image'." });
    return;
  }

  try {
    const extractedList = await extrairPublicacaoDeImagem(image, {
      provider: body.provider,
      model: body.model,
    });
    if (!extractedList.length) {
      res.status(400).json({ error: "Nenhuma publicação identificada na imagem." });
      return;
    }

    const baseEmailId = `print-${req.user.id}-${Date.now()}`;
    const publicacaoIds: number[] = [];
    const prazoIds: number[] = [];
    const skipped: string[] = [];

    for (let i = 0; i < extractedList.length; i++) {
      const extracted = extractedList[i];
      const item: ItemPublicacaoOab = {
        emailId: `${baseEmailId}-${i + 1}`,
        isRecorteDigital: true,
        publicacaoNumero: i + 1,
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
        skipped.push(result.skipped);
        continue;
      }
      if (result.publicacaoId) {
        publicacaoIds.push(result.publicacaoId);
        if (result.prazoIds?.length) prazoIds.push(...result.prazoIds);
      }
    }

    if (publicacaoIds.length === 0) {
      res.status(409).json({
        error: skipped.length ? "Todas as publicações já existem ou foram ignoradas." : "Falha ao gravar publicações.",
        skipped: skipped.length ? skipped : undefined,
      });
      return;
    }

    const n = publicacaoIds.length;
    res.status(201).json({
      publicacaoId: publicacaoIds[0],
      publicacaoIds,
      prazoIds,
      message: n === 1 ? "Publicação cadastrada com sucesso." : `${n} publicações cadastradas com sucesso.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao processar imagem.";
    console.error("Publicação por print:", err);
    if (message.includes("OPENAI_API_KEY") || message.includes("ANTHROPIC_API_KEY")) {
      res.status(503).json({
        error: "Serviço de extração por IA não configurado. Configure OPENAI_API_KEY ou ANTHROPIC_API_KEY.",
      });
      return;
    }
    res.status(500).json({ error: message });
  }
}
