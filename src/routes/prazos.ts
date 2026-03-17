import { Request, Response } from "express";
import { db } from "../db/index.js";
import { prazos, publicacoesOab, movimentacoes, prazoSubtarefas } from "../db/schema.js";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { sugerirSubtarefasParaPrazo } from "../lib/sugerir-subtarefas-ia.js";
import type { RequestWithUser } from "../middleware/auth.js";

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

export type PrazoSubtarefaItem = {
  id: number;
  titulo: string;
  concluida: boolean;
  ordem: number;
};

export type PrazoDetalhe = {
  id: number;
  prazo: string;
  data: string;
  tipo: string;
  status: number;
  numeroProcesso: string | null;
  observacao: string | null;
  conteudo: string | null;
  /** Resumo da publicação (IA) quando o prazo vem de publicação OAB */
  resumoPublicacao: string | null;
  /** Tipo e resumo da movimentação (ex.: Intimação para contestar) */
  movimentacaoTipo: string | null;
  resumoMovimentacao: string | null;
  publicacaoOabId: number | null;
  processoId: number | null;
  /** Link da peça/documento que deu cumprimento (ex.: OneDrive). */
  linkPeca: string | null;
  subtarefas: PrazoSubtarefaItem[];
};

/**
 * GET /api/prazos/:id
 * Retorna detalhe do prazo com resumo (publicação + movimentação) e checklist (subtarefas).
 */
export async function getPrazoById(
  req: Request,
  res: Response<PrazoDetalhe | { error: string }>
): Promise<void> {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const [row] = await db
      .select({
        id: prazos.id,
        prazo: prazos.prazo,
        data: prazos.data,
        tipo: prazos.tipo,
        status: prazos.status,
        numeroProcesso: prazos.numeroProcesso,
        observacao: prazos.observacao,
        conteudo: prazos.conteudo,
        publicacaoOabId: prazos.publicacaoOabId,
        processoId: prazos.processoId,
        linkPeca: prazos.linkPeca,
        resumo: publicacoesOab.resumo,
        movTipo: movimentacoes.tipo,
        movResumo: movimentacoes.resumo,
      })
      .from(prazos)
      .leftJoin(publicacoesOab, eq(prazos.publicacaoOabId, publicacoesOab.id))
      .leftJoin(movimentacoes, eq(prazos.movimentacaoId, movimentacoes.id))
      .where(eq(prazos.id, id))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Prazo não encontrado" });
      return;
    }

    const subtarefasRows = await db
      .select({
        id: prazoSubtarefas.id,
        titulo: prazoSubtarefas.titulo,
        concluida: prazoSubtarefas.concluida,
        ordem: prazoSubtarefas.ordem,
      })
      .from(prazoSubtarefas)
      .where(eq(prazoSubtarefas.idPrazo, id))
      .orderBy(prazoSubtarefas.ordem, prazoSubtarefas.id);

    const subtarefas: PrazoSubtarefaItem[] = subtarefasRows.map((s) => ({
      id: s.id,
      titulo: s.titulo,
      concluida: s.concluida,
      ordem: s.ordem,
    }));

    res.json({
      id: row.id,
      prazo: row.prazo,
      data: String(row.data),
      tipo: row.tipo,
      status: row.status,
      numeroProcesso: row.numeroProcesso,
      observacao: row.observacao,
      conteudo: row.conteudo ?? null,
      resumoPublicacao: row.resumo ?? null,
      movimentacaoTipo: row.movTipo ?? null,
      resumoMovimentacao: row.movResumo ?? null,
      publicacaoOabId: row.publicacaoOabId,
      processoId: row.processoId,
      linkPeca: row.linkPeca ?? null,
      subtarefas,
    });
  } catch (err) {
    console.error("Get prazo by id error:", err);
    res.status(500).json({ error: "Erro ao buscar prazo" });
  }
}

/**
 * PATCH /api/prazos/:id
 * Body: { cumprido?: boolean, linkPeca?: string }. Requer autenticação.
 * cumprido: true marca o prazo como cumprido (status = id do usuário, dataCumprido, dataHoraCumprido).
 * linkPeca: link da peça/documento (ex.: OneDrive) que deu cumprimento.
 */
export async function updatePrazo(
  req: RequestWithUser,
  res: Response<PrazoDetalhe | { error: string }>
): Promise<void> {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    if (!req.user) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }
    const body = (req.body || {}) as { cumprido?: boolean; linkPeca?: string | null };

    const [existing] = await db
      .select({
        id: prazos.id,
        status: prazos.status,
        linkPeca: prazos.linkPeca,
      })
      .from(prazos)
      .where(eq(prazos.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Prazo não encontrado" });
      return;
    }

    const updates: {
      status?: number;
      dataCumprido?: string;
      dataHoraCumprido?: Date;
      linkPeca?: string | null;
      updatedAt?: Date;
    } = { updatedAt: new Date() };

    if (body.cumprido === true) {
      updates.status = req.user.id;
      updates.dataCumprido = new Date().toISOString().slice(0, 10);
      updates.dataHoraCumprido = new Date();
    }
    if (body.linkPeca !== undefined) {
      const v = typeof body.linkPeca === "string" ? body.linkPeca.trim().slice(0, 1000) : null;
      updates.linkPeca = v || null;
    }

    if (Object.keys(updates).length <= 1) {
      res.status(400).json({ error: "Nenhum campo para atualizar (use cumprido e/ou linkPeca)" });
      return;
    }

    await db.update(prazos).set(updates).where(eq(prazos.id, id));

    const [row] = await db
      .select({
        id: prazos.id,
        prazo: prazos.prazo,
        data: prazos.data,
        tipo: prazos.tipo,
        status: prazos.status,
        numeroProcesso: prazos.numeroProcesso,
        observacao: prazos.observacao,
        conteudo: prazos.conteudo,
        publicacaoOabId: prazos.publicacaoOabId,
        processoId: prazos.processoId,
        linkPeca: prazos.linkPeca,
        resumo: publicacoesOab.resumo,
        movTipo: movimentacoes.tipo,
        movResumo: movimentacoes.resumo,
      })
      .from(prazos)
      .leftJoin(publicacoesOab, eq(prazos.publicacaoOabId, publicacoesOab.id))
      .leftJoin(movimentacoes, eq(prazos.movimentacaoId, movimentacoes.id))
      .where(eq(prazos.id, id))
      .limit(1);

    const subtarefasRows = await db
      .select({
        id: prazoSubtarefas.id,
        titulo: prazoSubtarefas.titulo,
        concluida: prazoSubtarefas.concluida,
        ordem: prazoSubtarefas.ordem,
      })
      .from(prazoSubtarefas)
      .where(eq(prazoSubtarefas.idPrazo, id))
      .orderBy(prazoSubtarefas.ordem, prazoSubtarefas.id);

    const subtarefas: PrazoSubtarefaItem[] = subtarefasRows.map((s) => ({
      id: s.id,
      titulo: s.titulo,
      concluida: s.concluida,
      ordem: s.ordem,
    }));

    if (!row) {
      res.status(500).json({ error: "Erro ao retornar prazo atualizado" });
      return;
    }
    res.json({
      id: row.id,
      prazo: row.prazo,
      data: String(row.data),
      tipo: row.tipo,
      status: row.status,
      numeroProcesso: row.numeroProcesso,
      observacao: row.observacao,
      conteudo: row.conteudo ?? null,
      resumoPublicacao: row.resumo ?? null,
      movimentacaoTipo: row.movTipo ?? null,
      resumoMovimentacao: row.movResumo ?? null,
      publicacaoOabId: row.publicacaoOabId,
      processoId: row.processoId,
      linkPeca: row.linkPeca ?? null,
      subtarefas,
    });
  } catch (err) {
    console.error("Update prazo error:", err);
    res.status(500).json({ error: "Erro ao atualizar prazo" });
  }
}

/**
 * POST /api/prazos/:id/subtarefas
 * Body: { titulo: string }
 */
export async function createSubtarefa(
  req: Request,
  res: Response<PrazoSubtarefaItem | { error: string }>
): Promise<void> {
  try {
    const idPrazo = parseInt(String(req.params.id), 10);
    if (!Number.isInteger(idPrazo) || idPrazo < 1) {
      res.status(400).json({ error: "ID do prazo inválido" });
      return;
    }
    const titulo = typeof (req.body as { titulo?: string }).titulo === "string"
      ? (req.body as { titulo: string }).titulo.trim()
      : "";
    if (!titulo) {
      res.status(400).json({ error: "Título é obrigatório" });
      return;
    }

    const [ultima] = await db
      .select({ ordem: prazoSubtarefas.ordem })
      .from(prazoSubtarefas)
      .where(eq(prazoSubtarefas.idPrazo, idPrazo))
      .orderBy(desc(prazoSubtarefas.ordem))
      .limit(1);
    const proximaOrdem = (ultima?.ordem ?? -1) + 1;

    const [inserted] = await db
      .insert(prazoSubtarefas)
      .values({
        idPrazo,
        titulo: titulo.slice(0, 500),
        concluida: false,
        ordem: proximaOrdem,
      })
      .returning({ id: prazoSubtarefas.id, titulo: prazoSubtarefas.titulo, concluida: prazoSubtarefas.concluida, ordem: prazoSubtarefas.ordem });

    if (!inserted) {
      res.status(500).json({ error: "Erro ao criar subtarefa" });
      return;
    }
    res.status(201).json({
      id: inserted.id,
      titulo: inserted.titulo,
      concluida: inserted.concluida,
      ordem: inserted.ordem,
    });
  } catch (err) {
    console.error("Create subtarefa error:", err);
    res.status(500).json({ error: "Erro ao criar subtarefa" });
  }
}

/**
 * PATCH /api/prazos/:idPrazo/subtarefas/:idItem
 * Body: { titulo?: string, concluida?: boolean }
 */
export async function updateSubtarefa(
  req: Request,
  res: Response<PrazoSubtarefaItem | { error: string }>
): Promise<void> {
  try {
    const idPrazo = parseInt(String(req.params.id), 10);
    const idItem = parseInt(String(req.params.idItem), 10);
    if (!Number.isInteger(idPrazo) || idPrazo < 1 || !Number.isInteger(idItem) || idItem < 1) {
      res.status(400).json({ error: "IDs inválidos" });
      return;
    }
    const body = req.body as { titulo?: string; concluida?: boolean };
    const updates: { titulo?: string; concluida?: boolean } = {};
    if (typeof body.titulo === "string" && body.titulo.trim()) updates.titulo = body.titulo.trim().slice(0, 500);
    if (typeof body.concluida === "boolean") updates.concluida = body.concluida;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "Nenhum campo para atualizar" });
      return;
    }

    const [updated] = await db
      .update(prazoSubtarefas)
      .set(updates)
      .where(and(eq(prazoSubtarefas.id, idItem), eq(prazoSubtarefas.idPrazo, idPrazo)))
      .returning({ id: prazoSubtarefas.id, titulo: prazoSubtarefas.titulo, concluida: prazoSubtarefas.concluida, ordem: prazoSubtarefas.ordem });

    if (!updated) {
      res.status(404).json({ error: "Subtarefa não encontrada" });
      return;
    }
    res.json({
      id: updated.id,
      titulo: updated.titulo,
      concluida: updated.concluida,
      ordem: updated.ordem,
    });
  } catch (err) {
    console.error("Update subtarefa error:", err);
    res.status(500).json({ error: "Erro ao atualizar subtarefa" });
  }
}

/**
 * DELETE /api/prazos/:idPrazo/subtarefas/:idItem
 */
export async function deleteSubtarefa(
  req: Request,
  res: Response<{ ok: boolean } | { error: string }>
): Promise<void> {
  try {
    const idPrazo = parseInt(String(req.params.id), 10);
    const idItem = parseInt(String(req.params.idItem), 10);
    if (!Number.isInteger(idPrazo) || idPrazo < 1 || !Number.isInteger(idItem) || idItem < 1) {
      res.status(400).json({ error: "IDs inválidos" });
      return;
    }

    const deleted = await db
      .delete(prazoSubtarefas)
      .where(and(eq(prazoSubtarefas.id, idItem), eq(prazoSubtarefas.idPrazo, idPrazo)))
      .returning({ id: prazoSubtarefas.id });

    if (deleted.length === 0) {
      res.status(404).json({ error: "Subtarefa não encontrada" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete subtarefa error:", err);
    res.status(500).json({ error: "Erro ao excluir subtarefa" });
  }
}

/**
 * POST /api/prazos/:id/sugerir-subtarefas
 * Usa contexto da publicação (e do processo se vinculado) para sugerir itens de checklist via IA.
 * Resposta: { ok: true, itens: [ { titulo: string }, ... ] } ou { error: string }
 */
export async function sugerirSubtarefas(
  req: Request,
  res: Response<{ ok: boolean; itens: { titulo: string }[] } | { error: string }>
): Promise<void> {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ error: "ID do prazo inválido" });
      return;
    }

    const resultado = await sugerirSubtarefasParaPrazo(id);
    if (!resultado.ok) {
      res.status(502).json({ error: resultado.erro ?? "Erro ao sugerir passos" });
      return;
    }
    res.json({ ok: true, itens: resultado.itens });
  } catch (err) {
    console.error("Sugerir subtarefas error:", err);
    res.status(500).json({ error: "Erro ao sugerir passos" });
  }
}
