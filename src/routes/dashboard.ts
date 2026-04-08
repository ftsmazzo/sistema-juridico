import { Response } from "express";
import { db } from "../db/index.js";
import {
  publicacoesOab,
  prazos,
  processos,
  analiseIaPublicacao,
  tarefaInterna,
  usuarios,
} from "../db/schema.js";
import { count, eq, gte, desc, and, isNotNull, inArray, lte, gt, isNull, sql, asc } from "drizzle-orm";
import type { RequestWithUser } from "../middleware/auth.js";
import { hojeIsoSaoPaulo, dataIsoMenorOuIgual } from "../lib/tarefas-internas-datas.js";

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

export type SemMovimentacaoBucket = {
  totalProcessos: number;
  totalPrazos: number;
};

export type AgrupamentoSemMovimentacao = {
  semInformacao: SemMovimentacaoBucket;
  dias30: SemMovimentacaoBucket;
  dias60: SemMovimentacaoBucket;
  dias90: SemMovimentacaoBucket;
  dias120Mais: SemMovimentacaoBucket;
};

/** Tarefas internas pendentes para o usuário logado (dashboard). */
export type DashboardTarefaInterna = {
  id: number;
  prazoId: number;
  titulo: string;
  dataLimite: string;
  tipo: string;
  prazoTitulo: string;
  numeroProcesso: string | null;
  nomeCriador: string;
  nomeResponsavel: string;
  /** Só faz sentido quando o usuário é o criador (delegou). */
  podeCobrar: boolean;
};

export type DashboardResponse = {
  totais: DashboardTotais;
  proximosPrazos: ProximoPrazo[];
  sugestoesIa: SugestaoIa[];
  agrupamentoSemMovimentacao: AgrupamentoSemMovimentacao;
  /** Preenchido quando há usuário autenticado. */
  tarefasParaExecutar: DashboardTarefaInterna[];
  tarefasDelegadas: DashboardTarefaInterna[];
};

function montarNome(u: { nome: string; sobrenome: string }): string {
  return `${u.nome} ${u.sobrenome}`.trim();
}

async function carregarTarefasInternasDashboard(
  userId: number
): Promise<{ paraExecutar: DashboardTarefaInterna[]; delegadas: DashboardTarefaInterna[] }> {
  const hoje = hojeIsoSaoPaulo();

  const comoExecutor = await db
    .select({
      id: tarefaInterna.id,
      prazoId: tarefaInterna.prazoId,
      titulo: tarefaInterna.titulo,
      dataLimite: tarefaInterna.dataLimite,
      tipo: tarefaInterna.tipo,
      idCriador: tarefaInterna.idCriador,
      idResponsavel: tarefaInterna.idResponsavel,
      prazoTitulo: prazos.prazo,
      numeroProcesso: prazos.numeroProcesso,
    })
    .from(tarefaInterna)
    .innerJoin(prazos, eq(tarefaInterna.prazoId, prazos.id))
    .where(and(eq(tarefaInterna.status, "pendente"), eq(tarefaInterna.idResponsavel, userId)))
    .orderBy(asc(tarefaInterna.dataLimite), asc(tarefaInterna.id))
    .limit(12);

  const comoCriador = await db
    .select({
      id: tarefaInterna.id,
      prazoId: tarefaInterna.prazoId,
      titulo: tarefaInterna.titulo,
      dataLimite: tarefaInterna.dataLimite,
      tipo: tarefaInterna.tipo,
      idCriador: tarefaInterna.idCriador,
      idResponsavel: tarefaInterna.idResponsavel,
      d3EnviadoEm: tarefaInterna.d3EnviadoEm,
      prazoTitulo: prazos.prazo,
      numeroProcesso: prazos.numeroProcesso,
    })
    .from(tarefaInterna)
    .innerJoin(prazos, eq(tarefaInterna.prazoId, prazos.id))
    .where(and(eq(tarefaInterna.status, "pendente"), eq(tarefaInterna.idCriador, userId)))
    .orderBy(asc(tarefaInterna.dataLimite), asc(tarefaInterna.id))
    .limit(12);

  const ids = new Set<number>();
  for (const r of comoExecutor) {
    ids.add(r.idCriador);
    ids.add(r.idResponsavel);
  }
  for (const r of comoCriador) {
    ids.add(r.idCriador);
    ids.add(r.idResponsavel);
  }
  const idList = [...ids].filter((id) => id > 0);
  const nomesRows =
    idList.length > 0
      ? await db
          .select({ id: usuarios.id, nome: usuarios.nome, sobrenome: usuarios.sobrenome })
          .from(usuarios)
          .where(inArray(usuarios.id, idList))
      : [];
  const nomePorId = new Map(nomesRows.map((u) => [u.id, montarNome(u)]));

  const paraExecutar: DashboardTarefaInterna[] = comoExecutor.map((r) => ({
    id: r.id,
    prazoId: r.prazoId,
    titulo: r.titulo,
    dataLimite: String(r.dataLimite),
    tipo: r.tipo,
    prazoTitulo: r.prazoTitulo,
    numeroProcesso: r.numeroProcesso,
    nomeCriador: nomePorId.get(r.idCriador) ?? `#${r.idCriador}`,
    nomeResponsavel: nomePorId.get(r.idResponsavel) ?? `#${r.idResponsavel}`,
    podeCobrar: false,
  }));

  const delegadas: DashboardTarefaInterna[] = comoCriador.map((r) => {
    const podeCobrar =
      r.d3EnviadoEm != null &&
      r.idCriador !== r.idResponsavel &&
      dataIsoMenorOuIgual(hoje, String(r.dataLimite));
    return {
      id: r.id,
      prazoId: r.prazoId,
      titulo: r.titulo,
      dataLimite: String(r.dataLimite),
      tipo: r.tipo,
      prazoTitulo: r.prazoTitulo,
      numeroProcesso: r.numeroProcesso,
      nomeCriador: nomePorId.get(r.idCriador) ?? `#${r.idCriador}`,
      nomeResponsavel: nomePorId.get(r.idResponsavel) ?? `#${r.idResponsavel}`,
      podeCobrar,
    };
  });

  return { paraExecutar, delegadas };
}

/**
 * GET /api/dashboard
 * Retorna totais, próximos prazos (pendentes) e sugestões/observações da IA.
 * Com token: inclui tarefas internas onde o usuário é responsável ou criador.
 */
export async function getDashboard(
  req: RequestWithUser,
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

    const [totaisProcessos] = await db
      .select({ count: count() })
      .from(processos);
    const processosCount = totaisProcessos?.count ?? 0;

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
      processos: processosCount,
    };

    // Processos por tempo sem movimentação (data_ultima_movimentacao)
    const hojeDate = new Date(hoje + "T12:00:00Z");
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const menos30 = fmt(new Date(hojeDate.getTime() - 30 * 24 * 60 * 60 * 1000));
    const menos60 = fmt(new Date(hojeDate.getTime() - 60 * 24 * 60 * 60 * 1000));
    const menos90 = fmt(new Date(hojeDate.getTime() - 90 * 24 * 60 * 60 * 1000));
    const menos120 = fmt(new Date(hojeDate.getTime() - 120 * 24 * 60 * 60 * 1000));

    const [semInfoProc] = await db
      .select({ count: count() })
      .from(processos)
      .where(isNull(processos.dataUltimaMovimentacao));
    const [dias30Proc] = await db
      .select({ count: count() })
      .from(processos)
      .where(
        and(
          lte(processos.dataUltimaMovimentacao!, menos30),
          gt(processos.dataUltimaMovimentacao!, menos60)
        )
      );
    const [dias60Proc] = await db
      .select({ count: count() })
      .from(processos)
      .where(
        and(
          lte(processos.dataUltimaMovimentacao!, menos60),
          gt(processos.dataUltimaMovimentacao!, menos90)
        )
      );
    const [dias90Proc] = await db
      .select({ count: count() })
      .from(processos)
      .where(
        and(
          lte(processos.dataUltimaMovimentacao!, menos90),
          gt(processos.dataUltimaMovimentacao!, menos120)
        )
      );
    const [dias120Proc] = await db
      .select({ count: count() })
      .from(processos)
      .where(lte(processos.dataUltimaMovimentacao!, menos120));

    // Prazos cujo processo está em cada bucket (por processo_id ou numero_processo)
    const semInfoPrazosResult = await db.execute<{ c: string }>(sql`
      SELECT COUNT(*)::int AS c FROM prazos pr
      WHERE EXISTS (
        SELECT 1 FROM processos p
        WHERE (pr.processo_id = p.id OR TRIM(COALESCE(pr.numero_processo,'')) = TRIM(p.numero_cnj))
        AND p.data_ultima_movimentacao IS NULL
      )
    `);
    const dias30PrazosResult = await db.execute<{ c: string }>(sql`
      SELECT COUNT(*)::int AS c FROM prazos pr
      WHERE EXISTS (
        SELECT 1 FROM processos p
        WHERE (pr.processo_id = p.id OR TRIM(COALESCE(pr.numero_processo,'')) = TRIM(p.numero_cnj))
        AND p.data_ultima_movimentacao IS NOT NULL
        AND p.data_ultima_movimentacao <= ${menos30}
        AND p.data_ultima_movimentacao > ${menos60}
      )
    `);
    const dias60PrazosResult = await db.execute<{ c: string }>(sql`
      SELECT COUNT(*)::int AS c FROM prazos pr
      WHERE EXISTS (
        SELECT 1 FROM processos p
        WHERE (pr.processo_id = p.id OR TRIM(COALESCE(pr.numero_processo,'')) = TRIM(p.numero_cnj))
        AND p.data_ultima_movimentacao IS NOT NULL
        AND p.data_ultima_movimentacao <= ${menos60}
        AND p.data_ultima_movimentacao > ${menos90}
      )
    `);
    const dias90PrazosResult = await db.execute<{ c: string }>(sql`
      SELECT COUNT(*)::int AS c FROM prazos pr
      WHERE EXISTS (
        SELECT 1 FROM processos p
        WHERE (pr.processo_id = p.id OR TRIM(COALESCE(pr.numero_processo,'')) = TRIM(p.numero_cnj))
        AND p.data_ultima_movimentacao IS NOT NULL
        AND p.data_ultima_movimentacao <= ${menos90}
        AND p.data_ultima_movimentacao > ${menos120}
      )
    `);
    const dias120PrazosResult = await db.execute<{ c: string }>(sql`
      SELECT COUNT(*)::int AS c FROM prazos pr
      WHERE EXISTS (
        SELECT 1 FROM processos p
        WHERE (pr.processo_id = p.id OR TRIM(COALESCE(pr.numero_processo,'')) = TRIM(p.numero_cnj))
        AND p.data_ultima_movimentacao IS NOT NULL
        AND p.data_ultima_movimentacao <= ${menos120}
      )
    `);

    const agrupamentoSemMovimentacao: AgrupamentoSemMovimentacao = {
      semInformacao: {
        totalProcessos: semInfoProc?.count ?? 0,
        totalPrazos: parseInt(semInfoPrazosResult.rows[0]?.c ?? "0", 10),
      },
      dias30: {
        totalProcessos: dias30Proc?.count ?? 0,
        totalPrazos: parseInt(dias30PrazosResult.rows[0]?.c ?? "0", 10),
      },
      dias60: {
        totalProcessos: dias60Proc?.count ?? 0,
        totalPrazos: parseInt(dias60PrazosResult.rows[0]?.c ?? "0", 10),
      },
      dias90: {
        totalProcessos: dias90Proc?.count ?? 0,
        totalPrazos: parseInt(dias90PrazosResult.rows[0]?.c ?? "0", 10),
      },
      dias120Mais: {
        totalProcessos: dias120Proc?.count ?? 0,
        totalPrazos: parseInt(dias120PrazosResult.rows[0]?.c ?? "0", 10),
      },
    };

    const sugestoesIa: SugestaoIa[] = sugestoes.map((s) => ({
      id: s.id,
      publicacaoOabId: s.publicacaoOabId,
      numeroProcesso: processoByPubId[s.publicacaoOabId] ?? null,
      resumo: s.resumo,
      observacoesIa: s.observacoesIa ?? "",
      createdAt: s.createdAt.toISOString(),
    }));

    let tarefasParaExecutar: DashboardTarefaInterna[] = [];
    let tarefasDelegadas: DashboardTarefaInterna[] = [];
    if (req.user?.id) {
      const t = await carregarTarefasInternasDashboard(req.user.id);
      tarefasParaExecutar = t.paraExecutar;
      tarefasDelegadas = t.delegadas;
    }

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
      agrupamentoSemMovimentacao,
      tarefasParaExecutar,
      tarefasDelegadas,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Erro ao carregar dashboard" });
  }
}
