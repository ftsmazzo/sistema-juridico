/**
 * Endpoint de teste do pipeline de monitoramento de e-mail:
 * corpo do e-mail → extrator Recorte → enriquecimento IA (mesmo prompt N8N) → processar publicação + prazos.
 *
 * POST /api/email-monitor/test
 * Body: { emailText?: string, emailHtml?: string, subject?: string, from?: string, to?: string, emailId?: string }
 * Requer autenticação.
 *
 * Permite colar o corpo de um e-mail Recorte Digital e validar se a qualidade da IA se mantém
 * (mesmo prompt da automação N8N, não o do print).
 */
import { Response } from "express";
import type { RequestWithUser } from "../middleware/auth.js";
import { extrairPublicacoesDeEmail } from "../lib/extrator-recorte-email.js";
import {
  enriquecerPublicacaoComIaTexto,
  mesclarEnriquecimentoNoItem,
} from "../lib/enriquecer-publicacao-ia-texto.js";
import { processarItemPublicacaoOab } from "../lib/processar-publicacao-oab.js";
import type { ItemPublicacaoOab } from "../lib/publicacoes-oab.types.js";

export type EmailMonitorTestBody = {
  emailText?: string;
  emailHtml?: string;
  subject?: string;
  from?: string;
  to?: string;
  emailId?: string;
};

export type EmailMonitorTestResponse = {
  ok: boolean;
  publicacoesExtraidas: number;
  publicacoesGravadas: number;
  prazosCriados: number;
  publicacaoIds: number[];
  prazoIds: number[];
  erros?: string[];
};

export async function emailMonitorTest(
  req: RequestWithUser,
  res: Response<EmailMonitorTestResponse | { error: string }>
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const body = req.body as EmailMonitorTestBody;
  const emailText = body?.emailText ?? body?.emailHtml;
  if (!emailText || typeof emailText !== "string") {
    res.status(400).json({
      error:
        "Envie o corpo do e-mail em 'emailText' ou 'emailHtml'. Cole o conteúdo de um e-mail Recorte Digital para testar.",
    });
    return;
  }

  try {
    const itens = extrairPublicacoesDeEmail({
      emailText: body.emailText || undefined,
      emailHtml: body.emailHtml || undefined,
      subject: body.subject,
      from: body.from,
      to: body.to,
      emailId: body.emailId,
    });

    if (itens.length === 0) {
      res.status(400).json({
        error:
          "Nenhuma publicação Recorte Digital encontrada no texto. Verifique se o e-mail é do Recorte Digital OAB/SP.",
      });
      return;
    }

    const publicacaoIds: number[] = [];
    const prazoIds: number[] = [];
    const erros: string[] = [];

    for (const item of itens) {
      try {
        const enriquecimento = await enriquecerPublicacaoComIaTexto(item);
        const itemEnriquecido = mesclarEnriquecimentoNoItem(
          item as ItemPublicacaoOab,
          enriquecimento
        );
        const result = await processarItemPublicacaoOab(itemEnriquecido);
        if (result.skipped) {
          erros.push(`Publicação ${item.publicacaoNumero} ignorada: ${result.skipped}`);
          continue;
        }
        if (result.publicacaoId) {
          publicacaoIds.push(result.publicacaoId);
          if (result.prazoIds?.length) prazoIds.push(...result.prazoIds);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        erros.push(`Publicação ${item.publicacaoNumero}: ${msg}`);
      }
    }

    res.json({
      ok: erros.length === 0,
      publicacoesExtraidas: itens.length,
      publicacoesGravadas: publicacaoIds.length,
      prazosCriados: prazoIds.length,
      publicacaoIds,
      prazoIds,
      ...(erros.length > 0 && { erros }),
    });
  } catch (err) {
    console.error("Email monitor test:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Erro ao processar e-mail de teste",
    });
  }
}
