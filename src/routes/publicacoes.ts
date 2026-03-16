import { Request, Response } from "express";
import { db } from "../db/index.js";
import { publicacoesOab, movimentacoes as movimentacoesTable } from "../db/schema.js";
import { desc, eq, asc } from "drizzle-orm";
import { criarPrazosAPartirDePublicacao } from "../lib/processar-publicacao-oab.js";

export type PublicacaoListItem = {
  id: number;
  subject: string | null;
  dataPublicacao: string | null;
  dateEmail: string | null;
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
        dateEmail: publicacoesOab.dateEmail,
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
        dateEmail: p.dateEmail ? p.dateEmail.toISOString() : null,
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

export type PublicacaoDetalhe = {
  id: number;
  emailId: string;
  subject: string | null;
  dateEmail: string | null;
  fromEmail: string | null;
  toEmail: string | null;
  advogadoPrincipal: string | null;
  numeroOab: string | null;
  dataProcessamento: string | null;
  totalPublicacoes: number | null;
  publicacaoNumero: number;
  dataDisponibilizacao: string | null;
  dataPublicacao: string | null;
  jornal: string | null;
  pagina: string | null;
  caderno: string | null;
  local: string | null;
  vara: string | null;
  tipoPublicacao: string | null;
  numeroProcesso: string | null;
  valorMencionado: string | null;
  textoCompleto: string | null;
  advogados: { nome: string; oab: string }[] | null;
  poloAtivo: string | null;
  polosPassivos: string[] | null;
  urlDocumento: string | null;
  identificadorDocumento: string | null;
  resumo: string | null;
  baseLegal: string | null;
  prazoDiasUteisSugerido: number | null;
  observacoesIa: string | null;
  movimentacoes: { tipo: string; resumo: string }[] | null;
  /** Movimentações da tabela (com fonte: email | ia | escavador) */
  movimentacoesComFonte: { tipo: string; resumo: string | null; ordem: number; fonte: string }[];
  fontesEmail: { emailId?: string; from?: string; to?: string }[];
  createdAt: string;
};

/**
 * GET /api/publicacoes/:id
 * Retorna uma publicação por id.
 */
export async function getPublicacaoById(
  req: Request,
  res: Response<PublicacaoDetalhe | { error: string }>
): Promise<void> {
  try {
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

    const movsComFonte = await db
      .select({
        tipo: movimentacoesTable.tipo,
        resumo: movimentacoesTable.resumo,
        ordem: movimentacoesTable.ordem,
        fonte: movimentacoesTable.fonte,
      })
      .from(movimentacoesTable)
      .where(eq(movimentacoesTable.publicacaoOabId, id))
      .orderBy(asc(movimentacoesTable.ordem), asc(movimentacoesTable.id));

    res.json({
      id: row.id,
      emailId: row.emailId,
      subject: row.subject,
      dateEmail: row.dateEmail ? row.dateEmail.toISOString() : null,
      fromEmail: row.fromEmail,
      toEmail: row.toEmail,
      advogadoPrincipal: row.advogadoPrincipal,
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
      advogados: row.advogados ?? null,
      poloAtivo: row.poloAtivo,
      polosPassivos: row.polosPassivos ?? null,
      urlDocumento: row.urlDocumento,
      identificadorDocumento: row.identificadorDocumento,
      resumo: row.resumo,
      baseLegal: row.baseLegal,
      prazoDiasUteisSugerido: row.prazoDiasUteisSugerido,
      observacoesIa: row.observacoesIa,
      movimentacoes: row.movimentacoes ?? null,
      movimentacoesComFonte: movsComFonte.map((m) => ({
        tipo: m.tipo,
        resumo: m.resumo,
        ordem: m.ordem,
        fonte: m.fonte,
      })),
      fontesEmail: (row.fontesEmail ?? []) as { emailId?: string; from?: string; to?: string }[],
      createdAt: row.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Get publicacao error:", err);
    res.status(500).json({ error: "Erro ao carregar publicação" });
  }
}

/** Campos permitidos para edição (PATCH) */
const EDITABLE_FIELDS = [
  "subject", "dataPublicacao", "dataDisponibilizacao", "tipoPublicacao",
  "numeroProcesso", "vara", "jornal", "pagina", "caderno", "local",
  "valorMencionado", "textoCompleto", "resumo", "baseLegal",
  "prazoDiasUteisSugerido", "observacoesIa", "urlDocumento", "identificadorDocumento",
  "advogadoPrincipal", "numeroOab", "poloAtivo", "advogados", "polosPassivos", "movimentacoes",
] as const;

/**
 * PATCH /api/publicacoes/:id
 * Body: objeto com campos a atualizar (apenas os editáveis).
 */
export async function updatePublicacao(
  req: Request,
  res: Response<PublicacaoDetalhe | { error: string }>
): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
      if (key in body) {
        const v = body[key];
        if (v === null || typeof v === "string" || typeof v === "number" || Array.isArray(v)) {
          update[key] = v;
        } else if (typeof v === "object" && v !== null) {
          update[key] = v;
        }
      }
    }

    if (Object.keys(update).length === 0) {
      const [row] = await db.select().from(publicacoesOab).where(eq(publicacoesOab.id, id)).limit(1);
      if (!row) {
        res.status(404).json({ error: "Publicação não encontrada" });
        return;
      }
      return getPublicacaoById(req, res);
    }

    const [updated] = await db
      .update(publicacoesOab)
      .set(update as Record<string, unknown>)
      .where(eq(publicacoesOab.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Publicação não encontrada" });
      return;
    }

    if ("movimentacoes" in update || "prazoDiasUteisSugerido" in update) {
      try {
        await criarPrazosAPartirDePublicacao(id);
      } catch (err) {
        console.error("Criar prazos a partir da publicação:", err);
      }
    }

    const row = updated;
    const movsComFonte = await db
      .select({
        tipo: movimentacoesTable.tipo,
        resumo: movimentacoesTable.resumo,
        ordem: movimentacoesTable.ordem,
        fonte: movimentacoesTable.fonte,
      })
      .from(movimentacoesTable)
      .where(eq(movimentacoesTable.publicacaoOabId, id))
      .orderBy(asc(movimentacoesTable.ordem), asc(movimentacoesTable.id));

    res.json({
      id: row.id,
      emailId: row.emailId,
      subject: row.subject,
      dateEmail: row.dateEmail ? row.dateEmail.toISOString() : null,
      fromEmail: row.fromEmail,
      toEmail: row.toEmail,
      advogadoPrincipal: row.advogadoPrincipal,
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
      advogados: row.advogados ?? null,
      poloAtivo: row.poloAtivo,
      polosPassivos: row.polosPassivos ?? null,
      urlDocumento: row.urlDocumento,
      identificadorDocumento: row.identificadorDocumento,
      resumo: row.resumo,
      baseLegal: row.baseLegal,
      prazoDiasUteisSugerido: row.prazoDiasUteisSugerido,
      observacoesIa: row.observacoesIa,
      movimentacoes: row.movimentacoes ?? null,
      movimentacoesComFonte: movsComFonte.map((m) => ({
        tipo: m.tipo,
        resumo: m.resumo,
        ordem: m.ordem,
        fonte: m.fonte,
      })),
      fontesEmail: (row.fontesEmail ?? []) as { emailId?: string; from?: string; to?: string }[],
      createdAt: row.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Update publicacao error:", err);
    res.status(500).json({ error: "Erro ao atualizar publicação" });
  }
}
