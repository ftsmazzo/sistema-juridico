import { Response } from "express";
import { db } from "../db/index.js";
import {
  processos,
  clientes,
  usuarios,
  movimentacoesProcesso,
  movimentacoes as movimentacoesPub,
  prazos,
  publicacoesOab,
  dadosEscavador,
} from "../db/schema.js";
import { eq, ilike, and, or, asc, desc, sql, lt, lte, gt, isNull, inArray } from "drizzle-orm";
import type { RequestWithUser } from "../middleware/auth.js";
import { podeCadastrarPessoas } from "../lib/roles.js";

export type ProcessoListItem = {
  id: number;
  numeroCnj: string;
  status: string;
  tipo: string | null;
  fase: string | null;
  tipoAcao: string | null;
  nomeCliente: string | null;
  nomeAdvogado: string | null;
  comarca: string | null;
  vara: string | null;
  dataPrazo: string | null;
  dataInicio: string | null;
  dataUltimaMovimentacao: string | null;
};

const PER_PAGE = 20;

export async function listProcessos(
  req: RequestWithUser,
  res: Response<
    | { items: ProcessoListItem[]; total: number; page: number; perPage: number }
    | { error: string }
  >
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }
    const q = (req.query.q as string)?.trim();
    const status = req.query.status as string | undefined;
    const idCliente = req.query.idCliente as string | undefined;
    const idAdvogado = req.query.idAdvogado as string | undefined;
    const semMovimentacao = req.query.semMovimentacao as string | undefined;
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const conditions = [];
    if (q) {
      conditions.push(
        or(
          ilike(processos.numeroCnj, `%${q}%`),
          ilike(processos.nomeCliente, `%${q}%`),
          ilike(processos.tipoAcao, `%${q}%`),
          ilike(processos.comarca, `%${q}%`)
        )!
      );
    }
    if (status) {
      conditions.push(eq(processos.status, status));
    }
    if (idCliente && Number.isInteger(Number(idCliente))) {
      conditions.push(eq(processos.idCliente, Number(idCliente)));
    }
    if (idAdvogado && Number.isInteger(Number(idAdvogado))) {
      conditions.push(eq(processos.idAdvogadoResponsavel, Number(idAdvogado)));
    }
    // Filtro por tempo sem movimentação (última mov. Escavador)
    const hoje = new Date().toISOString().slice(0, 10);
    const hojeDate = new Date(hoje + "T12:00:00Z");
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const menos30 = fmt(new Date(hojeDate.getTime() - 30 * 24 * 60 * 60 * 1000));
    const menos60 = fmt(new Date(hojeDate.getTime() - 60 * 24 * 60 * 60 * 1000));
    const menos90 = fmt(new Date(hojeDate.getTime() - 90 * 24 * 60 * 60 * 1000));
    const menos120 = fmt(new Date(hojeDate.getTime() - 120 * 24 * 60 * 60 * 1000));
    if (semMovimentacao === "sem-info") {
      conditions.push(isNull(processos.dataUltimaMovimentacao));
    } else if (semMovimentacao === "30") {
      conditions.push(
        and(
          lte(processos.dataUltimaMovimentacao!, menos30),
          gt(processos.dataUltimaMovimentacao!, menos60)
        )!
      );
    } else if (semMovimentacao === "60") {
      conditions.push(
        and(
          lte(processos.dataUltimaMovimentacao!, menos60),
          gt(processos.dataUltimaMovimentacao!, menos90)
        )!
      );
    } else if (semMovimentacao === "90") {
      conditions.push(
        and(
          lte(processos.dataUltimaMovimentacao!, menos90),
          gt(processos.dataUltimaMovimentacao!, menos120)
        )!
      );
    } else if (semMovimentacao === "120-mais") {
      conditions.push(lte(processos.dataUltimaMovimentacao!, menos120));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(processos)
      .where(whereClause);

    const list = await db
      .select({
        id: processos.id,
        numeroCnj: processos.numeroCnj,
        status: processos.status,
        tipo: processos.tipo,
        fase: processos.fase,
        tipoAcao: processos.tipoAcao,
        nomeCliente: processos.nomeCliente,
        nomeAdvogado: processos.nomeAdvogado,
        comarca: processos.comarca,
        vara: processos.vara,
        dataPrazo: processos.dataPrazo,
        dataInicio: processos.dataInicio,
        dataUltimaMovimentacao: processos.dataUltimaMovimentacao,
      })
      .from(processos)
      .where(whereClause)
      .orderBy(desc(processos.dataInicio), asc(processos.numeroCnj))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE);

    res.json({
      items: list.map((p) => ({
        ...p,
        dataPrazo: p.dataPrazo ? String(p.dataPrazo) : null,
        dataInicio: p.dataInicio ? String(p.dataInicio) : null,
        dataUltimaMovimentacao: p.dataUltimaMovimentacao
          ? String(p.dataUltimaMovimentacao)
          : null,
      })),
      total,
      page,
      perPage: PER_PAGE,
    });
  } catch (err) {
    console.error("List processos:", err);
    res.status(500).json({ error: "Erro ao listar processos" });
  }
}

export async function getProcessoById(
  req: RequestWithUser,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const [proc] = await db.select().from(processos).where(eq(processos.id, id)).limit(1);
    if (!proc) {
      res.status(404).json({ error: "Processo não encontrado" });
      return;
    }
    const [cliente] = proc.idCliente
      ? await db.select().from(clientes).where(eq(clientes.id, proc.idCliente)).limit(1)
      : [null];
    const [advogado] = proc.idAdvogadoResponsavel
      ? await db
          .select({
            id: usuarios.id,
            nome: usuarios.nome,
            sobrenome: usuarios.sobrenome,
            login: usuarios.login,
          })
          .from(usuarios)
          .where(eq(usuarios.id, proc.idAdvogadoResponsavel))
          .limit(1)
      : [null];
    const movimentacoes = await db
      .select()
      .from(movimentacoesProcesso)
      .where(eq(movimentacoesProcesso.idProcesso, id))
      .orderBy(asc(movimentacoesProcesso.ordem), asc(movimentacoesProcesso.id));
    const numeroCnjNorm = (proc.numeroCnj ?? "").trim();

    const wherePubProcesso = numeroCnjNorm
      ? or(
          eq(publicacoesOab.processoId, id),
          sql`trim(coalesce(${publicacoesOab.numeroProcesso}, '')) = ${numeroCnjNorm}`
        )
      : eq(publicacoesOab.processoId, id);
    const publicacoesDesteProcesso = await db
      .select({ id: publicacoesOab.id })
      .from(publicacoesOab)
      .where(wherePubProcesso);
    const pubIds = publicacoesDesteProcesso.map((r) => r.id);
    const movimentacoesFromPublicacoes =
      pubIds.length > 0
        ? await db
            .select({
              id: movimentacoesPub.id,
              tipo: movimentacoesPub.tipo,
              resumo: movimentacoesPub.resumo,
              ordem: movimentacoesPub.ordem,
              fonte: movimentacoesPub.fonte,
              dataLimite: movimentacoesPub.dataLimite,
              publicacaoOabId: movimentacoesPub.publicacaoOabId,
            })
            .from(movimentacoesPub)
            .where(inArray(movimentacoesPub.publicacaoOabId, pubIds))
            .orderBy(asc(movimentacoesPub.ordem), asc(movimentacoesPub.id))
        : [];

    const prazosVinculados = await db
      .select({
        id: prazos.id,
        prazo: prazos.prazo,
        data: prazos.data,
        status: prazos.status,
      })
      .from(prazos)
      .where(
        numeroCnjNorm
          ? or(
              eq(prazos.processoId, id),
              sql`trim(coalesce(${prazos.numeroProcesso}, '')) = ${numeroCnjNorm}`
            )
          : eq(prazos.processoId, id)
      )
      .orderBy(prazos.data, prazos.prazo);

    const publicacoesVinculadas = await db
      .select({
        id: publicacoesOab.id,
        subject: publicacoesOab.subject,
        tipoPublicacao: publicacoesOab.tipoPublicacao,
        dataPublicacao: publicacoesOab.dataPublicacao,
      })
      .from(publicacoesOab)
      .where(wherePubProcesso)
      .orderBy(desc(publicacoesOab.createdAt));

    const [{ count: countPrazos }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(prazos)
      .where(
        numeroCnjNorm
          ? or(
              eq(prazos.processoId, id),
              sql`trim(coalesce(${prazos.numeroProcesso}, '')) = ${numeroCnjNorm}`
            )
          : eq(prazos.processoId, id)
      );
    const [{ count: countPublicacoes }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(publicacoesOab)
      .where(
        numeroCnjNorm
          ? or(
              eq(publicacoesOab.processoId, id),
              sql`trim(coalesce(${publicacoesOab.numeroProcesso}, '')) = ${numeroCnjNorm}`
            )
          : eq(publicacoesOab.processoId, id)
      );
    res.json({
      ...proc,
      cliente: cliente ?? null,
      advogado: advogado
        ? { ...advogado, nomeCompleto: `${advogado.nome || ""} ${advogado.sobrenome || ""}`.trim() }
        : null,
      movimentacoes,
      movimentacoesFromPublicacoes: movimentacoesFromPublicacoes.map((m) => ({
        id: m.id,
        tipo: m.tipo,
        resumo: m.resumo,
        ordem: m.ordem,
        fonte: m.fonte,
        dataLimite: m.dataLimite ? String(m.dataLimite) : null,
        publicacaoOabId: m.publicacaoOabId,
      })),
      prazosVinculados: prazosVinculados.map((p) => ({
        id: p.id,
        prazo: p.prazo,
        data: String(p.data),
        status: p.status,
      })),
      publicacoesVinculadas: publicacoesVinculadas.map((p) => ({
        id: p.id,
        subject: p.subject,
        tipoPublicacao: p.tipoPublicacao,
        dataPublicacao: p.dataPublicacao,
      })),
      totalPrazos: countPrazos ?? 0,
      totalPublicacoes: countPublicacoes ?? 0,
    });
  } catch (err) {
    console.error("Get processo:", err);
    res.status(500).json({ error: "Erro ao buscar processo" });
  }
}

export async function createProcesso(
  req: RequestWithUser,
  res: Response
): Promise<void> {
  try {
    if (!req.user || !podeCadastrarPessoas(req.user.perfil, req.user.grupo)) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const numeroCnj = (body.numeroCnj as string)?.trim();
    if (!numeroCnj) {
      res.status(400).json({ error: "Número do processo (CNJ) é obrigatório" });
      return;
    }
    const [inserted] = await db
      .insert(processos)
      .values({
        numeroCnj,
        status: (body.status as string)?.trim() || "Ativo",
        tipo: (body.tipo as string)?.trim() || undefined,
        fase: (body.fase as string)?.trim() || undefined,
        tipoAcao: (body.tipoAcao as string)?.trim() || undefined,
        tipoCliente: (body.tipoCliente as string)?.trim() || undefined,
        idCliente: body.idCliente != null ? Number(body.idCliente) : undefined,
        nomeCliente: (body.nomeCliente as string)?.trim() || undefined,
        qualificacaoCliente: (body.qualificacaoCliente as string)?.trim() || undefined,
        outroEnvolvido: (body.outroEnvolvido as string)?.trim() || undefined,
        qualificacaoOutro: (body.qualificacaoOutro as string)?.trim() || undefined,
        idAdvogadoResponsavel: body.idAdvogadoResponsavel != null ? Number(body.idAdvogadoResponsavel) : undefined,
        nomeAdvogado: (body.nomeAdvogado as string)?.trim() || undefined,
        valorCausa: (body.valorCausa as string)?.trim() || undefined,
        valorAcordoSentenca: (body.valorAcordoSentenca as string)?.trim() || undefined,
        valorHonorariosReais: (body.valorHonorariosReais as string)?.trim() || undefined,
        valorHonorariosPercentual: (body.valorHonorariosPercentual as string)?.trim() || undefined,
        sucumbencias: (body.sucumbencias as string)?.trim() || undefined,
        totalHonorarios: (body.totalHonorarios as string)?.trim() || undefined,
        prazoEmAberto: body.prazoEmAberto === true || body.prazoEmAberto === "true",
        dataPrazo: (body.dataPrazo as string) || undefined,
        instancia: (body.instancia as string)?.trim() || undefined,
        comarca: (body.comarca as string)?.trim() || undefined,
        vara: (body.vara as string)?.trim() || undefined,
        observacoes: (body.observacoes as string)?.trim() || undefined,
        dataInicio: (body.dataInicio as string) || undefined,
        dataFim: (body.dataFim as string) || undefined,
        duracaoTexto: (body.duracaoTexto as string)?.trim() || undefined,
        resultado: (body.resultado as string)?.trim() || undefined,
        linkProcesso: (body.linkProcesso as string)?.trim() || undefined,
        linkPastaDocumentos: (body.linkPastaDocumentos as string)?.trim() || undefined,
        titulo: (body.titulo as string)?.trim() || undefined,
      })
      .returning();
    if (!inserted) {
      res.status(500).json({ error: "Erro ao criar processo" });
      return;
    }
    res.status(201).json(inserted);
  } catch (err: unknown) {
    const msg =
      err && typeof err === "object" && "code" in err && (err as { code: string }).code === "23505"
        ? "Já existe um processo com este número CNJ"
        : "Erro ao criar processo";
    console.error("Create processo:", err);
    res.status(500).json({ error: msg });
  }
}

export async function updateProcesso(
  req: RequestWithUser,
  res: Response
): Promise<void> {
  try {
    if (!req.user || !podeCadastrarPessoas(req.user.perfil, req.user.grupo)) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const allowed = [
      "status", "tipo", "fase", "tipoAcao", "tipoCliente", "idCliente", "nomeCliente",
      "qualificacaoCliente", "outroEnvolvido", "qualificacaoOutro",
      "idAdvogadoResponsavel", "nomeAdvogado", "valorCausa", "valorAcordoSentenca",
      "valorHonorariosReais", "valorHonorariosPercentual", "sucumbencias", "totalHonorarios",
      "prazoEmAberto", "dataPrazo", "instancia", "comarca", "vara", "observacoes",
      "dataInicio", "dataFim", "duracaoTexto", "resultado", "linkProcesso",
      "linkPastaDocumentos", "titulo",
    ];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        const v = body[key];
        if (typeof v === "string") (update as Record<string, string | null>)[key] = v.trim() || null;
        else (update as Record<string, unknown>)[key] = v;
      }
    }
    if (Object.keys(update).length === 0) {
      res.status(400).json({ error: "Nenhum campo para atualizar" });
      return;
    }
    const [updated] = await db
      .update(processos)
      .set(update as Record<string, unknown>)
      .where(eq(processos.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Processo não encontrado" });
      return;
    }
    res.json(updated);
  } catch (err) {
    console.error("Update processo:", err);
    res.status(500).json({ error: "Erro ao atualizar processo" });
  }
}

/** POST: popula movimentações do processo a partir das publicações OAB (IA/e-mail) vinculadas. */
export async function popularMovimentacoesPublicacoes(
  req: RequestWithUser,
  res: Response<{ inseridas: number; message: string } | { error: string }>
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const [proc] = await db.select().from(processos).where(eq(processos.id, id)).limit(1);
    if (!proc) {
      res.status(404).json({ error: "Processo não encontrado" });
      return;
    }
    const numeroCnjNorm = (proc.numeroCnj ?? "").trim();
    const wherePub = numeroCnjNorm
      ? or(
          eq(publicacoesOab.processoId, id),
          sql`trim(coalesce(${publicacoesOab.numeroProcesso}, '')) = ${numeroCnjNorm}`
        )
      : eq(publicacoesOab.processoId, id);
    const pubs = await db.select({ id: publicacoesOab.id }).from(publicacoesOab).where(wherePub);
    const pubIds = pubs.map((r) => r.id);
    if (pubIds.length === 0) {
      res.json({ inseridas: 0, message: "Nenhuma publicação vinculada a este processo." });
      return;
    }
    const movs = await db
      .select({
        tipo: movimentacoesPub.tipo,
        resumo: movimentacoesPub.resumo,
        ordem: movimentacoesPub.ordem,
        dataLimite: movimentacoesPub.dataLimite,
      })
      .from(movimentacoesPub)
      .where(inArray(movimentacoesPub.publicacaoOabId, pubIds))
      .orderBy(asc(movimentacoesPub.ordem), asc(movimentacoesPub.id));

    const maxOrdResult = await db
      .select({ ordem: movimentacoesProcesso.ordem })
      .from(movimentacoesProcesso)
      .where(eq(movimentacoesProcesso.idProcesso, id))
      .orderBy(desc(movimentacoesProcesso.ordem))
      .limit(1);
    let ordem = (maxOrdResult[0]?.ordem ?? 0) + 1;
    let inseridas = 0;
    for (const m of movs) {
      const texto = [m.tipo, m.resumo].filter(Boolean).join(": ");
      await db.insert(movimentacoesProcesso).values({
        idProcesso: id,
        ordem: ordem++,
        movimentacao: texto || m.tipo || null,
        dataMovimentacao: m.dataLimite ?? null,
      });
      inseridas++;
    }
    res.json({
      inseridas,
      message: `${inseridas} movimentação(ões) adicionada(s) a partir das publicações.`,
    });
  } catch (err) {
    console.error("Popular movimentações publicações:", err);
    res.status(500).json({ error: "Erro ao popular movimentações a partir das publicações." });
  }
}

/** POST: adiciona uma movimentação ao processo a partir do cache Escavador (data_ultima_movimentacao). */
export async function popularMovimentacoesEscavador(
  req: RequestWithUser,
  res: Response<{ inseridas: number; message: string } | { error: string }>
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const [proc] = await db.select().from(processos).where(eq(processos.id, id)).limit(1);
    if (!proc) {
      res.status(404).json({ error: "Processo não encontrado" });
      return;
    }
    const numeroCnj = (proc.numeroCnj ?? "").trim();
    if (!numeroCnj) {
      res.json({ inseridas: 0, message: "Processo sem número CNJ." });
      return;
    }
    const rows = await db
      .select({
        dataUltimaMovimentacao: dadosEscavador.dataUltimaMovimentacao,
      })
      .from(dadosEscavador)
      .where(eq(dadosEscavador.numeroCnj, numeroCnj))
      .orderBy(desc(dadosEscavador.dataUltimaMovimentacao))
      .limit(1);
    const row = rows[0];
    if (!row?.dataUltimaMovimentacao) {
      res.json({
        inseridas: 0,
        message: "Nenhum dado do Escavador para este processo. Sincronize por OAB em Dados Escavador.",
      });
      return;
    }
    const maxOrdResult = await db
      .select({ ordem: movimentacoesProcesso.ordem })
      .from(movimentacoesProcesso)
      .where(eq(movimentacoesProcesso.idProcesso, id))
      .orderBy(desc(movimentacoesProcesso.ordem))
      .limit(1);
    const ordem = (maxOrdResult[0]?.ordem ?? 0) + 1;
    await db.insert(movimentacoesProcesso).values({
      idProcesso: id,
      ordem,
      movimentacao: "Última movimentação (Escavador)",
      dataMovimentacao: row.dataUltimaMovimentacao,
    });
    res.json({
      inseridas: 1,
      message: "Uma movimentação adicionada a partir do Escavador.",
    });
  } catch (err) {
    console.error("Popular movimentações Escavador:", err);
    res.status(500).json({ error: "Erro ao popular movimentações do Escavador." });
  }
}

/** POST: atualiza processos com data_ultima_movimentacao a partir de dados_escavador (por numero_cnj). */
export async function enriquecerProcessosComEscavador(
  req: RequestWithUser,
  res: Response<{ updated: number; message: string } | { error: string }>
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }
    const result = await db.execute(sql`
      UPDATE processos p
      SET data_ultima_movimentacao = sub.max_mov
      FROM (
        SELECT numero_cnj, MAX(data_ultima_movimentacao) AS max_mov
        FROM dados_escavador
        WHERE data_ultima_movimentacao IS NOT NULL
        GROUP BY numero_cnj
      ) sub
      WHERE p.numero_cnj = sub.numero_cnj
    `);
    const updated = typeof (result as { rowCount?: number }).rowCount === "number"
      ? (result as { rowCount: number }).rowCount
      : 0;
    res.json({
      updated,
      message: `${updated} processo(s) atualizado(s) com última movimentação do Escavador.`,
    });
  } catch (err) {
    console.error("Enriquecer processos com Escavador:", err);
    res.status(500).json({ error: "Erro ao enriquecer processos com dados do Escavador." });
  }
}
