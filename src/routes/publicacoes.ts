import { Request, Response } from "express";
import { db } from "../db/index.js";
import {
  publicacoesOab,
  movimentacoes as movimentacoesTable,
  processos,
  usuarios,
  pessoas,
} from "../db/schema.js";
import { desc, eq, asc, sql } from "drizzle-orm";
import { criarPrazosAPartirDePublicacao } from "../lib/processar-publicacao-oab.js";
import { garantirProcessoParaPublicacao } from "../lib/vincular-publicacao-processo.js";
import { prepararCadastroProcesso } from "../lib/cadastrar-processo-com-clientes.js";
import type { ProcessoExtraidoIa } from "../lib/extrair-processo-por-ia.js";
import type { RequestWithUser } from "../middleware/auth.js";

export type PublicacaoListItem = {
  id: number;
  subject: string | null;
  dataPublicacao: string | null;
  dateEmail: string | null;
  tipoPublicacao: string | null;
  numeroProcesso: string | null;
  vara: string | null;
  /** OAB(s) dos nossos advogados na publicação: apenas números, separados por vírgula. */
  oabs: string | null;
  createdAt: string;
};

/** Extrai apenas a parte numérica da OAB para exibição (ex.: "12345/SP" ou "SP 12345" → "12345"). */
function extrairNumeroOab(oab: string): string {
  const apenasNumeros = oab.replace(/\D/g, "");
  return apenasNumeros || oab.trim();
}

/**
 * GET /api/publicacoes
 * Query: limit (default 50), exibir (pendentes | todas | arquivadas)
 * - pendentes (padrão): só publicações que ainda têm prazo pendente (ou não têm prazos). Quando todos os prazos são cumpridos, a publicação "some" da lista.
 * - todas: todas as publicações
 * - arquivadas: só publicações cujos prazos estão todos cumpridos
 */
export async function listPublicacoes(
  req: Request,
  res: Response<PublicacaoListItem[] | { error: string }>
): Promise<void> {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const exibir = (req.query.exibir as string)?.toLowerCase() || "pendentes";

    // OABs dos nossos advogados (usuários ativos + pessoas): conjunto de partes numéricas para match
    // (na publicação pode vir "123456/SP" ou "12345 - SP"; no sistema pode estar "123456" ou "123456/SP")
    const [usuariosOabs, pessoasOabs] = await Promise.all([
      db.select({ numeroOab: usuarios.numeroOab }).from(usuarios).where(eq(usuarios.ativo, true)),
      db.select({ numeroOab: pessoas.numeroOab }).from(pessoas),
    ]);
    const nossasOabsNumeros = new Set<string>();
    for (const r of [...usuariosOabs, ...pessoasOabs]) {
      const raw = (r.numeroOab ?? "").trim();
      if (!raw) continue;
      const num = extrairNumeroOab(raw);
      if (num) nossasOabsNumeros.add(num);
    }

    const selectFields = {
      id: publicacoesOab.id,
      subject: publicacoesOab.subject,
      dataPublicacao: publicacoesOab.dataPublicacao,
      dateEmail: publicacoesOab.dateEmail,
      tipoPublicacao: publicacoesOab.tipoPublicacao,
      numeroProcesso: publicacoesOab.numeroProcesso,
      vara: publicacoesOab.vara,
      numeroOab: publicacoesOab.numeroOab,
      advogados: publicacoesOab.advogados,
      createdAt: publicacoesOab.createdAt,
    };

    let list;
    if (exibir === "todas") {
      list = await db
        .select(selectFields)
        .from(publicacoesOab)
        .orderBy(desc(publicacoesOab.createdAt))
        .limit(limit);
    } else if (exibir === "arquivadas") {
      list = await db
        .select(selectFields)
        .from(publicacoesOab)
        .where(
          sql`EXISTS (SELECT 1 FROM prazos WHERE prazos.publicacao_oab_id = ${publicacoesOab.id}) AND NOT EXISTS (SELECT 1 FROM prazos WHERE prazos.publicacao_oab_id = ${publicacoesOab.id} AND prazos.status = 0)`
        )
        .orderBy(desc(publicacoesOab.createdAt))
        .limit(limit);
    } else {
      // pendentes (padrão): sem prazos OU tem pelo menos um prazo pendente → publicação "some" quando todos cumpridos
      list = await db
        .select(selectFields)
        .from(publicacoesOab)
        .where(
          sql`NOT EXISTS (SELECT 1 FROM prazos WHERE prazos.publicacao_oab_id = ${publicacoesOab.id}) OR EXISTS (SELECT 1 FROM prazos WHERE prazos.publicacao_oab_id = ${publicacoesOab.id} AND prazos.status = 0)`
        )
        .orderBy(desc(publicacoesOab.createdAt))
        .limit(limit);
    }

    res.json(
      list.map((p) => {
        const advs = (p.advogados ?? []) as { oab?: string }[];
        const textosOab: string[] = [];
        if (p.numeroOab?.trim()) textosOab.push(p.numeroOab.trim());
        advs.forEach((a) => {
          if (a?.oab?.trim()) textosOab.push(a.oab.trim());
        });
        // Manter apenas OABs cuja parte numérica está entre as dos nossos advogados
        const numerosNossos = new Set<string>();
        for (const texto of textosOab) {
          const num = extrairNumeroOab(texto);
          if (num && nossasOabsNumeros.has(num)) {
            numerosNossos.add(num);
          }
        }
        const oabs = numerosNossos.size > 0 ? Array.from(numerosNossos).sort().join(", ") : null;
        return {
          id: p.id,
          subject: p.subject,
          dataPublicacao: p.dataPublicacao,
          dateEmail: p.dateEmail ? p.dateEmail.toISOString() : null,
          tipoPublicacao: p.tipoPublicacao,
          numeroProcesso: p.numeroProcesso,
          vara: p.vara,
          oabs,
          createdAt: p.createdAt.toISOString(),
        };
      })
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
  processoId: number | null;
  processoNumeroCnj: string | null;
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

    let processoNumeroCnj: string | null = null;
    if (row.processoId) {
      const [proc] = await db
        .select({ numeroCnj: processos.numeroCnj })
        .from(processos)
        .where(eq(processos.id, row.processoId))
        .limit(1);
      processoNumeroCnj = proc?.numeroCnj ?? null;
    }

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
      processoId: row.processoId ?? null,
      processoNumeroCnj,
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

/**
 * POST /api/publicacoes/:id/recriar-prazos
 * Recalcula prazos a partir dos dados de IA já gravados (regra 5 du fatal / 3 du no calendário quando sem prazo específico).
 */
/**
 * GET /api/publicacoes/:id/preparar-processo
 * Monta preview para formulário de cadastro de processo + cliente a partir da publicação.
 */
export async function prepararProcessoDePublicacao(
  req: RequestWithUser,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Não autenticado" });
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
    const polosPassivos = Array.isArray(row.polosPassivos) ? row.polosPassivos : [];
    const extraido: ProcessoExtraidoIa = {
      numeroCnj: row.numeroProcesso ?? undefined,
      vara: row.vara ?? undefined,
      comarca: row.local ?? undefined,
      tipoAcao: row.tipoPublicacao ?? undefined,
      nomeCliente: row.poloAtivo ?? undefined,
      outroEnvolvido: polosPassivos[0] ?? undefined,
      valorCausa: row.valorMencionado ?? undefined,
      observacoes: row.resumo ?? row.observacoesIa ?? undefined,
      status: "Ativo",
    };
    const preparado = await prepararCadastroProcesso(extraido, {
      nomeClienteOverride: row.poloAtivo,
    });
    res.json({
      ok: true,
      publicacaoId: id,
      ...preparado,
    });
  } catch (err) {
    console.error("prepararProcessoDePublicacao:", err);
    res.status(500).json({ error: "Erro ao preparar cadastro do processo." });
  }
}

/**
 * POST /api/publicacoes/:id/criar-processo
 * @deprecated Preferir preparar-processo + confirmar em /api/processos/por-documento/confirmar
 */
export async function criarProcessoDePublicacao(
  req: RequestWithUser,
  res: Response<
    | { ok: boolean; processoId: number; criado: boolean; message: string }
    | { error: string }
  >
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const [row] = await db
      .select({ id: publicacoesOab.id, numeroProcesso: publicacoesOab.numeroProcesso })
      .from(publicacoesOab)
      .where(eq(publicacoesOab.id, id))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "Publicação não encontrada" });
      return;
    }
    if (!row.numeroProcesso?.trim()) {
      res.status(400).json({ error: "Publicação sem número de processo." });
      return;
    }
    const { processoId, criado } = await garantirProcessoParaPublicacao(id, {
      criarSeAusente: true,
    });
    if (!processoId) {
      res.status(500).json({ error: "Não foi possível criar ou vincular o processo." });
      return;
    }
    res.json({
      ok: true,
      processoId,
      criado,
      message: criado
        ? "Processo criado e publicação vinculada."
        : "Processo já existia; publicação vinculada.",
    });
  } catch (err) {
    console.error("criarProcessoDePublicacao:", err);
    res.status(500).json({ error: "Erro ao criar processo a partir da publicação." });
  }
}

export async function recriarPrazosPublicacao(
  req: Request,
  res: Response<{ ok: boolean; prazoIds: number[] } | { error: string }>
): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const [row] = await db
      .select({ id: publicacoesOab.id })
      .from(publicacoesOab)
      .where(eq(publicacoesOab.id, id))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "Publicação não encontrada" });
      return;
    }
    const { prazoIds } = await criarPrazosAPartirDePublicacao(id);
    res.json({ ok: true, prazoIds });
  } catch (err) {
    console.error("Recriar prazos publicacao error:", err);
    res.status(500).json({ error: "Erro ao recriar prazos da publicação" });
  }
}
