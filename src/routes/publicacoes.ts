import { Request, Response } from "express";
import { db } from "../db/index.js";
import { publicacoesOab } from "../db/schema.js";
import { desc } from "drizzle-orm";

export type PublicacaoListItem = {
  id: number;
  subject: string | null;
  dataPublicacao: string | null;
  tipoPublicacao: string | null;
  numeroProcesso: string | null;
  vara: string | null;
  resumo: string | null;
  createdAt: string;
};

/**
 * GET /api/publicacoes
 * Query: limit (default 50)
 * Lista publicações OAB ordenadas por criação (mais recente primeiro).
 */
export async function listPublicacoes(
  req: Request,
  res: Response<PublicacaoListItem[] | { error: string }>
): Promise<void> {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const list = await db
      .select({
        id: publicacoesOab.id,
        subject: publicacoesOab.subject,
        dataPublicacao: publicacoesOab.dataPublicacao,
        tipoPublicacao: publicacoesOab.tipoPublicacao,
        numeroProcesso: publicacoesOab.numeroProcesso,
        vara: publicacoesOab.vara,
        resumo: publicacoesOab.resumo,
        createdAt: publicacoesOab.createdAt,
      })
      .from(publicacoesOab)
      .orderBy(desc(publicacoesOab.createdAt))
      .limit(limit);

    res.json(
      list.map((p) => ({
        id: p.id,
        subject: p.subject,
        dataPublicacao: p.dataPublicacao,
        tipoPublicacao: p.tipoPublicacao,
        numeroProcesso: p.numeroProcesso,
        vara: p.vara,
        resumo: p.resumo,
        createdAt: p.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error("List publicacoes error:", err);
    res.status(500).json({ error: "Erro ao listar publicações" });
  }
}
