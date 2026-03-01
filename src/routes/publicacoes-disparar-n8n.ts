/**
 * POST /api/publicacoes/:id/disparar-analise-n8n
 * Envia a publicação para o webhook do N8N (final da automação) para rodar apenas a análise com IA.
 * O N8N recebe o payload, executa o nó de IA (Claude), faz o merge e chama PATCH /api/publicacoes/:id
 * para atualizar resumo, baseLegal, observacoesIa, movimentacoes, prazoDiasUteisSugerido.
 *
 * Requer: WEBHOOK_N8N_ANALISE_PUBLICACAO_URL (URL do webhook no N8N).
 * Requer autenticação.
 */
import { Response } from "express";
import type { RequestWithUser } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { publicacoesOab } from "../db/schema.js";
import { eq } from "drizzle-orm";

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
    res.json({
      ok: true,
      message:
        "Enviado para análise no N8N. A publicação será atualizada em instantes se o workflow estiver ativo.",
    });
  } catch (err) {
    console.error("Disparar análise N8N:", err);
    res.status(502).json({
      error: err instanceof Error ? err.message : "Erro ao chamar o webhook N8N",
    });
  }
}
