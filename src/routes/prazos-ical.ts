/**
 * GET /api/prazos/export.ics — exporta os prazos do usuário logado em .ics (download).
 * GET /api/prazos/feed.ics?token=XXX — feed de inscrição (sem auth; token identifica o usuário).
 * GET /api/prazos/link-inscricao — retorna a URL de inscrição do usuário (gera token se não existir).
 * POST /api/prazos/backfill-usuarios — backfill prazos_usuarios por OAB/processo (para calendário).
 */
import { Response } from "express";
import type { RequestWithUser } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { usuarios } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { buildIcsFromPrazos } from "../lib/ical-prazos.js";
import { getPrazosDoUsuarioParaIcs } from "../lib/prazos-do-usuario.js";
import { backfillPrazosUsuarios } from "../lib/processar-publicacao-oab.js";
import crypto from "crypto";

/** GET /api/prazos/export.ics — download .ics dos prazos do usuário (autenticado). */
export async function getExportIcs(
  req: RequestWithUser,
  res: Response<string | { error: string }>
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  const inicio = (req.query.inicio as string)?.trim().slice(0, 10);
  const fim = (req.query.fim as string)?.trim().slice(0, 10);

  try {
    const lista = await getPrazosDoUsuarioParaIcs(req.user.id, inicio || undefined, fim || undefined);
    const ics = buildIcsFromPrazos(lista);
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="prazos.ics"');
    res.send(ics);
  } catch (err) {
    console.error("Export .ics:", err);
    res.status(500).json({ error: "Erro ao gerar .ics" });
  }
}

/** GET /api/prazos/feed.ics?token=XXX — feed para inscrição na agenda (público com token). */
export async function getFeedIcs(
  req: RequestWithUser,
  res: Response<string | { error: string }>
): Promise<void> {
  const token = (req.query.token as string)?.trim();
  if (!token) {
    res.status(400).json({ error: "Token obrigatório" });
    return;
  }

  const [u] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.calendarFeedToken, token))
    .limit(1);
  if (!u) {
    res.status(404).json({ error: "Link inválido ou revogado" });
    return;
  }

  try {
    const lista = await getPrazosDoUsuarioParaIcs(u.id);
    const ics = buildIcsFromPrazos(lista, "Prazos - Agenda Prazos");
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(ics);
  } catch (err) {
    console.error("Feed .ics:", err);
    res.status(500).json({ error: "Erro ao gerar feed" });
  }
}

function generateFeedToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** GET /api/prazos/link-inscricao — retorna a URL de inscrição; gera token se não existir. */
export async function getLinkInscricao(
  req: RequestWithUser,
  res: Response<{ url: string; totalPrazos: number } | { error: string }>
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const [u] = await db
    .select({ calendarFeedToken: usuarios.calendarFeedToken })
    .from(usuarios)
    .where(eq(usuarios.id, req.user.id))
    .limit(1);
  if (!u) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  let token = u.calendarFeedToken?.trim();
  if (!token) {
    token = generateFeedToken();
    await db
      .update(usuarios)
      .set({ calendarFeedToken: token, updatedAt: new Date() })
      .where(eq(usuarios.id, req.user.id));
  }

  const baseUrl = process.env.PUBLIC_URL || req.protocol + "://" + req.get("host") || "";
  const url = `${baseUrl.replace(/\/$/, "")}/api/prazos/feed.ics?token=${token}`;
  const totalPrazos = (await getPrazosDoUsuarioParaIcs(req.user.id)).length;
  res.json({ url, totalPrazos });
}

/** POST /api/prazos/backfill-usuarios — vincula prazos a usuários por OAB/processo (calendário). */
export async function postBackfillUsuarios(
  req: RequestWithUser,
  res: Response<{ prazosProcessados: number; vinculosInseridos: number } | { error: string }>
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  try {
    const result = await backfillPrazosUsuarios();
    res.json(result);
  } catch (err) {
    console.error("Backfill prazos_usuarios:", err);
    res.status(500).json({ error: "Erro ao executar backfill" });
  }
}
