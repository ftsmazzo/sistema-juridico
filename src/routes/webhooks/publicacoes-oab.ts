import { Request, Response } from "express";
import type { ItemPublicacaoOab } from "../../lib/publicacoes-oab.types.js";
import { processarItemPublicacaoOab } from "../../lib/processar-publicacao-oab.js";

/**
 * POST /api/webhooks/publicacoes-oab
 * Body: array de ItemPublicacaoOab
 */
export async function handlePublicacoesOab(req: Request, res: Response) {
  const secret = process.env.WEBHOOK_PUBLICACOES_OAB_SECRET;
  if (secret) {
    const auth =
      req.headers.authorization?.replace(/^Bearer\s+/i, "") ??
      req.headers["x-webhook-secret"];
    if (auth !== secret) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }
  }

  let body: unknown;
  try {
    body = req.body;
  } catch {
    res.status(400).json({ ok: false, error: "Invalid JSON" });
    return;
  }

  let itens: ItemPublicacaoOab[];
  if (Array.isArray(body)) {
    itens = body as ItemPublicacaoOab[];
  } else if (
    body &&
    typeof body === "object" &&
    "publicacoes" in body
  ) {
    const pub = (body as { publicacoes: unknown }).publicacoes;
    if (Array.isArray(pub)) {
      itens = pub as ItemPublicacaoOab[];
    } else if (pub && typeof pub === "object" && ("isRecorteDigital" in pub || "emailId" in pub)) {
      itens = [ pub as ItemPublicacaoOab ];
    } else {
      itens = [];
    }
  } else if (
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ("isRecorteDigital" in body || "emailId" in body || "numeroProcesso" in body)
  ) {
    itens = [ body as ItemPublicacaoOab ];
  } else {
    res.status(400).json({
      ok: false,
      error:
        "Body must be an array, { \"publicacoes\": [ ... ] }, or a single publication object",
    });
    return;
  }
  let publicacoesRecebidas = 0;
  let publicacoesIgnoradas = 0;
  let prazosCriados = 0;
  const detalhes: { numeroProcesso?: string; publicacaoId?: number; prazoId?: number }[] =
    [];

  for (const item of itens) {
    if (!item.isRecorteDigital) {
      publicacoesIgnoradas++;
      continue;
    }
    if (
      item.publicacaoNumero == null ||
      (item.publicacoes && item.publicacoes.length === 0)
    ) {
      publicacoesIgnoradas++;
      continue;
    }

    try {
      const result = await processarItemPublicacaoOab(item);
      if (result.skipped) {
        publicacoesIgnoradas++;
        continue;
      }
      publicacoesRecebidas++;
      const ids = result.prazoIds ?? [];
      prazosCriados += ids.length;
      ids.forEach((prazoId) =>
        detalhes.push({
          numeroProcesso: item.numeroProcesso,
          publicacaoId: result.publicacaoId,
          prazoId,
        })
      );
    } catch (err) {
      console.error("Erro ao processar item publicacao OAB:", err);
    }
  }

  res.status(200).json({
    ok: true,
    publicacoesRecebidas,
    publicacoesIgnoradas,
    prazosCriados,
    detalhes,
  });
}
