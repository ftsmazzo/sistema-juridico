import { Request, Response } from "express";
import { db } from "../db/index.js";
import {
  publicacoesOab,
  prazos,
  analiseIaPublicacao,
} from "../db/schema.js";
import { count, eq, gte, desc, and, isNotNull, sql, inArray } from "drizzle-orm";

export type DashboardTotais = {
  publicacoes: number;
  prazos: number;
  prazosPendentes: number;
  processos: number;
};

export type ProximoPrazo = {
  id: number;
  prazo: string;
  data: string;
  tipo: string;
  numeroProcesso: string | null;
  status: number;
};

export type SugestaoIa = {
  id: number;
  publicacaoOabId: number;
  numeroProcesso: string | null;
  resumo: string | null;
  observacoesIa: string;
  createdAt: string;
};

export type DashboardResponse = {
  totais: DashboardTotais;
  proximosPrazos: ProximoPrazo[];
  sugestoesIa: SugestaoIa[];
};

/**
 * GET /api/dashboard
 * Retorna totais, próximos prazos (pendentes) e sugestões/observações da IA.
 */
export async function getDashboard(
  _req: Request,
  res: Response<DashboardResponse | { error: string }>
): Promise<void> {
  try {
    const hoje = new Date().toISOString().slice(0, 10);

    const [totaisPub] = await db
      .select({ count: count() })
      .from(publicacoesOab);

    const [totaisPrazos] = await db.select({ count: count() }).from(prazos);

    const [totaisPendentes] = await db
      .select({ count: count() })
      .from(prazos)
      .where(eq(prazos.status, 0));

    const processosResult = await db.execute<{ c: string }>(
      sql`SELECT COUNT(DISTINCT numero_processo)::text as c FROM prazos WHERE numero_processo IS NOT NULL`
    );
    const processos = parseInt(processosResult.rows[0]?.c ?? "0", 10);

    const proximos = await db
      .select({
        id: prazos.id,
        prazo: prazos.prazo,
        data: prazos.data,
        tipo: prazos.tipo,
        numeroProcesso: prazos.numeroProcesso,
        status: prazos.status,
      })
      .from(prazos)
      .where(and(eq(prazos.status, 0), gte(prazos.data, hoje)))
      .orderBy(prazos.data)
      .limit(10);

    const sugestoes = await db
      .select({
        id: analiseIaPublicacao.id,
        publicacaoOabId: analiseIaPublicacao.publicacaoOabId,
        resumo: analiseIaPublicacao.resumo,
        observacoesIa: analiseIaPublicacao.observacoesIa,
        createdAt: analiseIaPublicacao.createdAt,
      })
      .from(analiseIaPublicacao)
      .where(isNotNull(analiseIaPublicacao.observacoesIa))
      .orderBy(desc(analiseIaPublicacao.createdAt))
      .limit(5);

    const publicacaoIds = sugestoes.map((s) => s.publicacaoOabId);
    const processosPorPub =
      publicacaoIds.length > 0
        ? await db
            .select({
              publicacaoOabId: publicacoesOab.id,
              numeroProcesso: publicacoesOab.numeroProcesso,
            })
            .from(publicacoesOab)
            .where(inArray(publicacoesOab.id, publicacaoIds))
        : [];

    const processoByPubId = Object.fromEntries(
      processosPorPub.map((r) => [r.publicacaoOabId, r.numeroProcesso])
    );

    const totais: DashboardTotais = {
      publicacoes: totaisPub?.count ?? 0,
      prazos: totaisPrazos?.count ?? 0,
      prazosPendentes: totaisPendentes?.count ?? 0,
      processos,
    };

    const sugestoesIa: SugestaoIa[] = sugestoes.map((s) => ({
      id: s.id,
      publicacaoOabId: s.publicacaoOabId,
      numeroProcesso: processoByPubId[s.publicacaoOabId] ?? null,
      resumo: s.resumo,
      observacoesIa: s.observacoesIa ?? "",
      createdAt: s.createdAt.toISOString(),
    }));

    res.json({
      totais,
      proximosPrazos: proximos.map((p) => ({
        id: p.id,
        prazo: p.prazo,
        data: String(p.data),
        tipo: p.tipo,
        numeroProcesso: p.numeroProcesso,
        status: p.status,
      })),
      sugestoesIa,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Erro ao carregar dashboard" });
  }
}
