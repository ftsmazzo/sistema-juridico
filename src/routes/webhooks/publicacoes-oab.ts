import { Request, Response } from "express";
import { db } from "../../db/index.js";
import {
  publicacoesOab,
  prazos,
  prazosUsuarios,
  usuarios,
} from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import type { ItemPublicacaoOab } from "../../lib/publicacoes-oab.types.js";
import {
  adicionarDiasUteis,
  formatarDataSql,
} from "../../lib/calcular-prazo.js";

const DIAS_UTEIS_PRAZO_INTIMACAO = 15;

/**
 * Normaliza OAB para comparação: "270074 - SP" ou "270074/SP" -> "270074/SP"
 */
function normalizarOab(oab: string | undefined): string | null {
  if (!oab || !oab.trim()) return null;
  return oab.replace(/\s*-\s*/g, "/").trim().toUpperCase();
}

/**
 * Processa um item de publicação: grava em publicacoes_oab e, se for Intimação, cria prazo.
 */
async function processarItem(
  item: ItemPublicacaoOab
): Promise<{ publicacaoId?: number; prazoId?: number; skipped?: string }> {
  if (!item.isRecorteDigital || item.publicacaoNumero == null) {
    return {};
  }

  const numeroProcesso = item.numeroProcesso ?? "";
  const identificadorDocumento = item.identificadorDocumento ?? "";
  const emailId = item.emailId;
  const publicacaoNumero = item.publicacaoNumero;

  // Deduplicação: já existe publicação com mesmo emailId + publicacaoNumero?
  const [existente] = await db
    .select({ id: publicacoesOab.id })
    .from(publicacoesOab)
    .where(
      and(
        eq(publicacoesOab.emailId, emailId),
        eq(publicacoesOab.publicacaoNumero, publicacaoNumero)
      )
    )
    .limit(1);
  if (existente) return { skipped: "duplicada" };

  if (numeroProcesso && identificadorDocumento) {
    const [existenteProcesso] = await db
      .select({ id: publicacoesOab.id })
      .from(publicacoesOab)
      .where(
        and(
          eq(publicacoesOab.numeroProcesso, numeroProcesso),
          eq(publicacoesOab.identificadorDocumento, identificadorDocumento)
        )
      )
      .limit(1);
    if (existenteProcesso) return { skipped: "processo_documento_ja_existe" };
  }

  const dateEmail = item.date ? new Date(item.date) : null;

  const [pub] = await db
    .insert(publicacoesOab)
    .values({
      emailId,
      subject: item.subject ?? null,
      dateEmail,
      fromEmail: item.from ?? null,
      toEmail: item.to ?? null,
      advogadoPrincipal: item.advogado ?? null,
      numeroOab: item.numeroOab ?? null,
      dataProcessamento: item.dataProcessamento ?? null,
      totalPublicacoes: item.totalPublicacoes ?? null,
      publicacaoNumero,
      dataDisponibilizacao: item.dataDisponibilizacao ?? null,
      dataPublicacao: item.dataPublicacao ?? null,
      jornal: item.jornal ?? null,
      pagina: item.pagina ?? null,
      caderno: item.caderno ?? null,
      local: item.local ?? null,
      vara: item.vara ?? null,
      tipoPublicacao: item.tipoPublicacao ?? null,
      numeroProcesso: numeroProcesso || null,
      valorMencionado: item.valorMencionado ?? null,
      textoCompleto: item.textoCompleto ?? null,
      advogados: item.advogados ?? null,
      poloAtivo: item.poloAtivo ?? null,
      polosPassivos: item.polosPassivos ?? null,
      urlDocumento: item.urlDocumento ?? null,
      identificadorDocumento: identificadorDocumento || null,
    })
    .returning({ id: publicacoesOab.id });

  const publicacaoId = pub?.id;
  if (!publicacaoId) return {};

  const tipoNorm = (item.tipoPublicacao ?? "").toLowerCase();
  const ehIntimacao =
    tipoNorm.includes("intimação") || tipoNorm.includes("intimacao");

  if (!ehIntimacao) {
    return { publicacaoId };
  }

  const dataPub = item.dataPublicacao ?? item.dataDisponibilizacao ?? "";
  const dataLimite = adicionarDiasUteis(dataPub, DIAS_UTEIS_PRAZO_INTIMACAO);
  const dataPrazoStr = formatarDataSql(dataLimite);

  const observacao = [numeroProcesso, item.vara].filter(Boolean).join(" | ");
  const nomePrazo = `Intimação ${numeroProcesso}`.slice(0, 255);

  const [prazo] = await db
    .insert(prazos)
    .values({
      tipo: "civil",
      data: dataPrazoStr,
      observacao,
      conteudo: item.textoCompleto ?? "",
      prazo: nomePrazo,
      status: 0,
      publicacaoOabId: publicacaoId,
      numeroProcesso: numeroProcesso || null,
    })
    .returning({ id: prazos.id });

  const prazoId = prazo?.id;
  if (!prazoId) return { publicacaoId };

  const oabsPublicacao = new Set<string>();
  if (item.numeroOab) {
    const n = normalizarOab(item.numeroOab);
    if (n) oabsPublicacao.add(n);
  }
  (item.advogados ?? []).forEach((a) => {
    const n = normalizarOab(a.oab);
    if (n) oabsPublicacao.add(n);
  });

  const usuariosDoEscritorio = await db
    .select({ id: usuarios.id, numeroOab: usuarios.numeroOab })
    .from(usuarios)
    .where(eq(usuarios.ativo, true));

  for (const u of usuariosDoEscritorio) {
    const oabUser = normalizarOab(u.numeroOab ?? undefined);
    if (oabUser && oabsPublicacao.has(oabUser)) {
      await db.insert(prazosUsuarios).values({
        idPrazo: prazoId,
        idUsuario: u.id,
      });
    }
  }

  return { publicacaoId, prazoId };
}

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
    "publicacoes" in body &&
    Array.isArray((body as { publicacoes: unknown }).publicacoes)
  ) {
    itens = (body as { publicacoes: ItemPublicacaoOab[] }).publicacoes;
  } else {
    res.status(400).json({
      ok: false,
      error:
        "Body must be an array of publication items, or { \"publicacoes\": [ ... ] }",
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
      const result = await processarItem(item);
      if (result.skipped) {
        publicacoesIgnoradas++;
        continue;
      }
      publicacoesRecebidas++;
      if (result.prazoId) {
        prazosCriados++;
        detalhes.push({
          numeroProcesso: item.numeroProcesso,
          publicacaoId: result.publicacaoId,
          prazoId: result.prazoId,
        });
      }
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
