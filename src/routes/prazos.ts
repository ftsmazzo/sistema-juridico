import { Request, Response } from "express";
import { db } from "../db/index.js";
import { prazos } from "../db/schema.js";
import { and, eq, gte, lte } from "drizzle-orm";

export type PrazoListItem = {
  id: number;
  prazo: string;
  data: string;
  tipo: string;
  status: number;
  numeroProcesso: string | null;
  observacao: string | null;
};

/**
 * GET /api/prazos
 * Query: inicio (YYYY-MM-DD), fim (YYYY-MM-DD), status (0=pendente), tipo (civil|trabalhista|administrativo)
 */
export async function listPrazos(
  req: Request,
  res: Response<PrazoListItem[] | { error: string }>
): Promise<void> {
  try {
    const inicio = req.query.inicio as string | undefined;
    const fim = req.query.fim as string | undefined;
    const status = req.query.status as string | undefined;
    const tipo = req.query.tipo as string | undefined;

    const conditions = [];

    if (inicio) conditions.push(gte(prazos.data, inicio));
    if (fim) conditions.push(lte(prazos.data, fim));
    if (status !== undefined && status !== "") conditions.push(eq(prazos.status, Number(status)));
    if (tipo?.trim()) conditions.push(eq(prazos.tipo, tipo.trim()));

    const list = await db
      .select({
        id: prazos.id,
        prazo: prazos.prazo,
        data: prazos.data,
        tipo: prazos.tipo,
        status: prazos.status,
        numeroProcesso: prazos.numeroProcesso,
        observacao: prazos.observacao,
      })
      .from(prazos)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(prazos.data, prazos.prazo);

    res.json(
      list.map((p) => ({
        id: p.id,
        prazo: p.prazo,
        data: String(p.data),
        tipo: p.tipo,
        status: p.status,
        numeroProcesso: p.numeroProcesso,
        observacao: p.observacao,
      }))
    );
  } catch (err) {
    console.error("List prazos error:", err);
    res.status(500).json({ error: "Erro ao listar prazos" });
  }
}
