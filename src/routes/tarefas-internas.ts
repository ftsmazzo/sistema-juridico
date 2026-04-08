import { Request, Response } from "express";
import { db } from "../db/index.js";
import {
  prazos,
  tarefaInterna,
  tarefaLabel,
  tarefaInternaLabel,
  usuarios,
} from "../db/schema.js";
import { and, asc, eq, gte, inArray, isNull, lte, type SQL } from "drizzle-orm";
import type { RequestWithUser } from "../middleware/auth.js";
import { buscarTelefonePorUsuarioId } from "../lib/notifica-publicacao.js";
import {
  TAREFA_INTERNA_TIPOS,
  montarMsgAlertaD3,
  montarMsgCobranca,
  montarMsgTarefaCriada,
  montarMsgTarefaCumprida,
  notificarDestinatarioTarefa,
} from "../lib/notifica-tarefa-interna.js";
import {
  dataIsoMenorOuIgual,
  dataMenosNDiasUteis,
  dentroJanelaAlertaTarefa,
  hojeIsoSaoPaulo,
} from "../lib/tarefas-internas-datas.js";

const STATUS = ["pendente", "cumprida", "cancelada"] as const;
type StatusTarefa = (typeof STATUS)[number];

function isTipoValido(t: string): boolean {
  return (TAREFA_INTERNA_TIPOS as readonly string[]).includes(t);
}

async function nomeUsuario(id: number): Promise<string> {
  const [u] = await db
    .select({ nome: usuarios.nome, sobrenome: usuarios.sobrenome })
    .from(usuarios)
    .where(eq(usuarios.id, id))
    .limit(1);
  if (!u) return `#${id}`;
  return `${u.nome} ${u.sobrenome}`.trim();
}

async function assertCelularesCriadorEResponsavel(
  idCriador: number,
  idResponsavel: number
): Promise<{ ok: true } | { ok: false; message: string }> {
  const c = await buscarTelefonePorUsuarioId(idCriador);
  const r = await buscarTelefonePorUsuarioId(idResponsavel);
  if (!c) {
    return {
      ok: false,
      message:
        "Cadastre o celular do usuário que está criando a tarefa (perfil) para receber notificações de conclusão.",
    };
  }
  if (!r) {
    return {
      ok: false,
      message:
        "O responsável não tem celular cadastrado. Atualize o cadastro do usuário ou da pessoa vinculada antes de criar a tarefa.",
    };
  }
  return { ok: true };
}

function canonLabel(n: string): string {
  return n.trim().toLowerCase();
}

async function findOrCreateLabel(nomeBruto: string): Promise<{ id: number; nome: string }> {
  const nome = nomeBruto.trim().slice(0, 120);
  if (!nome) throw new Error("Nome da label vazio");
  const c = canonLabel(nome);
  const todas = await db.select({ id: tarefaLabel.id, nome: tarefaLabel.nome }).from(tarefaLabel);
  const exist = todas.find((row) => canonLabel(row.nome) === c);
  if (exist) return exist;
  const [ins] = await db.insert(tarefaLabel).values({ nome }).returning({ id: tarefaLabel.id, nome: tarefaLabel.nome });
  if (!ins) throw new Error("Falha ao criar label");
  return ins;
}

async function setLabelsDaTarefa(tarefaId: number, labelIds: number[]): Promise<void> {
  await db.delete(tarefaInternaLabel).where(eq(tarefaInternaLabel.tarefaInternaId, tarefaId));
  const uniq = [...new Set(labelIds)].filter((id) => Number.isInteger(id) && id > 0);
  if (uniq.length === 0) return;
  await db.insert(tarefaInternaLabel).values(uniq.map((tarefaLabelId) => ({ tarefaInternaId: tarefaId, tarefaLabelId })));
}

async function getLabelIdsDaTarefa(tarefaId: number): Promise<number[]> {
  const rows = await db
    .select({ id: tarefaInternaLabel.tarefaLabelId })
    .from(tarefaInternaLabel)
    .where(eq(tarefaInternaLabel.tarefaInternaId, tarefaId));
  return rows.map((r) => r.id);
}

async function getLabelsDetalhe(tarefaId: number): Promise<{ id: number; nome: string }[]> {
  const rows = await db
    .select({ id: tarefaLabel.id, nome: tarefaLabel.nome })
    .from(tarefaInternaLabel)
    .innerJoin(tarefaLabel, eq(tarefaInternaLabel.tarefaLabelId, tarefaLabel.id))
    .where(eq(tarefaInternaLabel.tarefaInternaId, tarefaId));
  return rows;
}

export type TarefaInternaApiItem = {
  id: number;
  prazoId: number;
  titulo: string;
  descricao: string | null;
  tipo: string;
  dataLimite: string;
  idCriador: number;
  idResponsavel: number;
  nomeCriador: string;
  nomeResponsavel: string;
  status: string;
  cumpridaEm: string | null;
  numeroProcesso: string | null;
  labels: { id: number; nome: string }[];
  d3EnviadoEm: string | null;
  podeCobrar: boolean;
};

async function mapRowToApi(
  row: (typeof tarefaInterna)["$inferSelect"],
  extras?: { nomeCriador?: string; nomeResponsavel?: string }
): Promise<TarefaInternaApiItem> {
  const [p] = await db
    .select({ numeroProcesso: prazos.numeroProcesso })
    .from(prazos)
    .where(eq(prazos.id, row.prazoId))
    .limit(1);
  const labels = await getLabelsDetalhe(row.id);
  const nc = extras?.nomeCriador ?? (await nomeUsuario(row.idCriador));
  const nr = extras?.nomeResponsavel ?? (await nomeUsuario(row.idResponsavel));
  const hoje = hojeIsoSaoPaulo();
  const podeCobrar =
    row.status === "pendente" &&
    row.d3EnviadoEm != null &&
    row.idCriador !== row.idResponsavel;
  const prazoOk = dataIsoMenorOuIgual(hoje, String(row.dataLimite));
  return {
    id: row.id,
    prazoId: row.prazoId,
    titulo: row.titulo,
    descricao: row.descricao ?? null,
    tipo: row.tipo,
    dataLimite: String(row.dataLimite),
    idCriador: row.idCriador,
    idResponsavel: row.idResponsavel,
    nomeCriador: nc,
    nomeResponsavel: nr,
    status: row.status,
    cumpridaEm: row.cumpridaEm ? row.cumpridaEm.toISOString() : null,
    numeroProcesso: p?.numeroProcesso ?? null,
    labels,
    d3EnviadoEm: row.d3EnviadoEm ? row.d3EnviadoEm.toISOString() : null,
    podeCobrar: podeCobrar && prazoOk,
  };
}

/** GET /api/tarefa-labels */
export async function listTarefaLabels(_req: Request, res: Response): Promise<void> {
  try {
    const rows = await db.select().from(tarefaLabel).orderBy(asc(tarefaLabel.nome));
    res.json(rows.map((r) => ({ id: r.id, nome: r.nome })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao listar labels" });
  }
}

/** POST /api/tarefa-labels { nome } */
export async function postTarefaLabel(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const nome = String((req.body as { nome?: string })?.nome ?? "").trim();
    if (!nome) {
      res.status(400).json({ error: "nome é obrigatório" });
      return;
    }
    const row = await findOrCreateLabel(nome);
    res.status(201).json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao criar label" });
  }
}

/** DELETE /api/tarefa-labels/:id — só se não houver uso */
export async function deleteTarefaLabel(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const [usada] = await db
      .select({ id: tarefaInternaLabel.tarefaInternaId })
      .from(tarefaInternaLabel)
      .where(eq(tarefaInternaLabel.tarefaLabelId, id))
      .limit(1);
    if (usada) {
      res.status(409).json({ error: "Label em uso; não é possível excluir." });
      return;
    }
    await db.delete(tarefaLabel).where(eq(tarefaLabel.id, id));
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao excluir label" });
  }
}

/** GET /api/tarefas-internas */
export async function listTarefasInternas(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const q = req.query;
    const statusF = (q.status as string)?.trim();
    const atrasadas = q.atrasadas === "1" || q.atrasadas === "true";
    const idResp = q.idResponsavel ? parseInt(String(q.idResponsavel), 10) : NaN;
    const idCri = q.idCriador ? parseInt(String(q.idCriador), 10) : NaN;
    const prazoId = q.prazoId ? parseInt(String(q.prazoId), 10) : NaN;
    const tipo = (q.tipo as string)?.trim();
    const dIni = (q.dataLimiteInicio as string)?.trim();
    const dFim = (q.dataLimiteFim as string)?.trim();
    const labelIdsRaw = (q.labelIds as string)?.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => Number.isInteger(n)) ?? [];

    const cond: SQL[] = [];
    if (statusF && (STATUS as readonly string[]).includes(statusF)) {
      cond.push(eq(tarefaInterna.status, statusF as StatusTarefa));
    }
    if (Number.isInteger(idResp) && idResp > 0) cond.push(eq(tarefaInterna.idResponsavel, idResp));
    if (Number.isInteger(idCri) && idCri > 0) cond.push(eq(tarefaInterna.idCriador, idCri));
    if (Number.isInteger(prazoId) && prazoId > 0) cond.push(eq(tarefaInterna.prazoId, prazoId));
    if (tipo && isTipoValido(tipo)) cond.push(eq(tarefaInterna.tipo, tipo));
    if (dIni) cond.push(gte(tarefaInterna.dataLimite, dIni));
    if (dFim) cond.push(lte(tarefaInterna.dataLimite, dFim));

    let rows = await db
      .select()
      .from(tarefaInterna)
      .where(cond.length ? and(...cond) : undefined)
      .orderBy(asc(tarefaInterna.dataLimite), asc(tarefaInterna.id));

    const hoje = hojeIsoSaoPaulo();
    if (atrasadas) {
      rows = rows.filter((r) => r.status === "pendente" && String(r.dataLimite) < hoje);
    }

    if (labelIdsRaw.length > 0) {
      const comLabel = await db
        .selectDistinct({ tid: tarefaInternaLabel.tarefaInternaId })
        .from(tarefaInternaLabel)
        .where(inArray(tarefaInternaLabel.tarefaLabelId, labelIdsRaw));
      const setIds = new Set(comLabel.map((c) => c.tid));
      rows = rows.filter((r) => setIds.has(r.id));
    }

    const out: TarefaInternaApiItem[] = [];
    for (const r of rows) out.push(await mapRowToApi(r));
    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao listar tarefas internas" });
  }
}

/** GET /api/tarefas-internas/:id */
export async function getTarefaInterna(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const [row] = await db.select().from(tarefaInterna).where(eq(tarefaInterna.id, id)).limit(1);
    if (!row) {
      res.status(404).json({ error: "Tarefa não encontrada" });
      return;
    }
    res.json(await mapRowToApi(row));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao carregar tarefa" });
  }
}

/** POST /api/tarefas-internas */
export async function postTarefaInterna(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const body = req.body as {
      prazoId?: number;
      titulo?: string;
      descricao?: string | null;
      tipo?: string;
      dataLimite?: string;
      idResponsavel?: number;
      labelIds?: number[];
    };
    const prazoId = Number(body.prazoId);
    const titulo = String(body.titulo ?? "").trim();
    const descricao = body.descricao != null ? String(body.descricao).trim() || null : null;
    const tipo = String(body.tipo ?? "").trim();
    const dataLimite = String(body.dataLimite ?? "").trim();
    const idResponsavel = Number(body.idResponsavel);
    const labelIds = Array.isArray(body.labelIds) ? body.labelIds.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0) : [];

    if (!Number.isInteger(prazoId) || prazoId <= 0 || !titulo || !dataLimite || !isTipoValido(tipo) || !Number.isInteger(idResponsavel) || idResponsavel <= 0) {
      res.status(400).json({ error: "Dados inválidos (prazoId, titulo, tipo, dataLimite, idResponsavel)" });
      return;
    }
    if (idResponsavel === userId) {
      res.status(400).json({ error: "O responsável deve ser outro usuário." });
      return;
    }

    const [p] = await db.select({ id: prazos.id }).from(prazos).where(eq(prazos.id, prazoId)).limit(1);
    if (!p) {
      res.status(404).json({ error: "Prazo não encontrado" });
      return;
    }

    const tel = await assertCelularesCriadorEResponsavel(userId, idResponsavel);
    if (!tel.ok) {
      res.status(400).json({ error: tel.message });
      return;
    }

    const [ins] = await db
      .insert(tarefaInterna)
      .values({
        prazoId,
        titulo: titulo.slice(0, 500),
        descricao,
        tipo,
        dataLimite,
        idCriador: userId,
        idResponsavel,
        status: "pendente",
        updatedAt: new Date(),
      })
      .returning();

    if (!ins) {
      res.status(500).json({ error: "Falha ao criar tarefa" });
      return;
    }

    await setLabelsDaTarefa(ins.id, labelIds);

    const nomeCriador = await nomeUsuario(userId);
    const nomeResponsavel = await nomeUsuario(idResponsavel);
    const [pr] = await db
      .select({ numeroProcesso: prazos.numeroProcesso })
      .from(prazos)
      .where(eq(prazos.id, prazoId))
      .limit(1);

    const msg = montarMsgTarefaCriada({
      titulo,
      tipo,
      dataLimite,
      numeroProcesso: pr?.numeroProcesso ?? null,
      nomeCriador,
      nomeResponsavel,
      descricao,
    });
    const ok = await notificarDestinatarioTarefa("criada", msg, idResponsavel, {
      tarefaInternaId: ins.id,
      prazoId,
    });
    await db
      .update(tarefaInterna)
      .set({
        criacaoNotificadaEm: ok ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(tarefaInterna.id, ins.id));

    res.status(201).json(await mapRowToApi(ins, { nomeCriador, nomeResponsavel }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao criar tarefa interna" });
  }
}

/** PATCH /api/tarefas-internas/:id */
export async function patchTarefaInterna(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const [row] = await db.select().from(tarefaInterna).where(eq(tarefaInterna.id, id)).limit(1);
    if (!row) {
      res.status(404).json({ error: "Tarefa não encontrada" });
      return;
    }
    if (row.idCriador !== userId) {
      res.status(403).json({ error: "Apenas quem criou pode editar." });
      return;
    }
    if (row.status !== "pendente") {
      res.status(409).json({ error: "Só é possível editar tarefas pendentes." });
      return;
    }

    const body = req.body as {
      titulo?: string;
      descricao?: string | null;
      tipo?: string;
      dataLimite?: string;
      idResponsavel?: number;
      labelIds?: number[];
      status?: string;
    };

    if (body.status === "cancelada") {
      await db
        .update(tarefaInterna)
        .set({ status: "cancelada", updatedAt: new Date() })
        .where(eq(tarefaInterna.id, id));
      const [cancelada] = await db.select().from(tarefaInterna).where(eq(tarefaInterna.id, id)).limit(1);
      res.json(await mapRowToApi(cancelada!));
      return;
    }

    const titulo = body.titulo != null ? String(body.titulo).trim() : row.titulo;
    const descricao =
      body.descricao !== undefined ? (String(body.descricao).trim() || null) : row.descricao;
    const tipo = body.tipo != null ? String(body.tipo).trim() : row.tipo;
    const dataLimite = body.dataLimite != null ? String(body.dataLimite).trim() : String(row.dataLimite);
    const idResponsavel =
      body.idResponsavel != null ? Number(body.idResponsavel) : row.idResponsavel;

    if (!titulo || !isTipoValido(tipo) || !Number.isInteger(idResponsavel) || idResponsavel <= 0) {
      res.status(400).json({ error: "Dados inválidos" });
      return;
    }
    if (idResponsavel === userId) {
      res.status(400).json({ error: "O responsável deve ser outro usuário." });
      return;
    }

    const tel = await assertCelularesCriadorEResponsavel(userId, idResponsavel);
    if (!tel.ok) {
      res.status(400).json({ error: tel.message });
      return;
    }

    const labelIds =
      body.labelIds !== undefined
        ? body.labelIds.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0)
        : await getLabelIdsDaTarefa(id);

    const mudou =
      titulo !== row.titulo ||
      descricao !== row.descricao ||
      tipo !== row.tipo ||
      dataLimite !== String(row.dataLimite) ||
      idResponsavel !== row.idResponsavel ||
      JSON.stringify([...labelIds].sort()) !== JSON.stringify((await getLabelIdsDaTarefa(id)).sort());

    await db
      .update(tarefaInterna)
      .set({
        titulo: titulo.slice(0, 500),
        descricao,
        tipo,
        dataLimite,
        idResponsavel,
        d3EnviadoEm: mudou ? null : row.d3EnviadoEm,
        updatedAt: new Date(),
      })
      .where(eq(tarefaInterna.id, id));

    await setLabelsDaTarefa(id, labelIds);

    if (mudou) {
      const nomeCriador = await nomeUsuario(userId);
      const nomeResponsavel = await nomeUsuario(idResponsavel);
      const [pr] = await db
        .select({ numeroProcesso: prazos.numeroProcesso })
        .from(prazos)
        .where(eq(prazos.id, row.prazoId))
        .limit(1);
      const msg = montarMsgTarefaCriada({
        titulo,
        tipo,
        dataLimite,
        numeroProcesso: pr?.numeroProcesso ?? null,
        nomeCriador,
        nomeResponsavel,
        descricao,
      });
      const ok = await notificarDestinatarioTarefa("criada", msg, idResponsavel, {
        tarefaInternaId: id,
        prazoId: row.prazoId,
      });
      await db
        .update(tarefaInterna)
        .set({
          criacaoNotificadaEm: ok ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(tarefaInterna.id, id));
    }

    const [updated] = await db.select().from(tarefaInterna).where(eq(tarefaInterna.id, id)).limit(1);
    res.json(await mapRowToApi(updated!));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao atualizar tarefa" });
  }
}

/** POST /api/tarefas-internas/:id/cumprir */
export async function postTarefaInternaCumprir(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const [row] = await db.select().from(tarefaInterna).where(eq(tarefaInterna.id, id)).limit(1);
    if (!row) {
      res.status(404).json({ error: "Tarefa não encontrada" });
      return;
    }
    if (row.idResponsavel !== userId) {
      res.status(403).json({ error: "Apenas o responsável pode marcar como cumprida." });
      return;
    }
    if (row.status !== "pendente") {
      res.status(409).json({ error: "Tarefa não está pendente." });
      return;
    }

    const agora = new Date();
    await db
      .update(tarefaInterna)
      .set({
        status: "cumprida",
        cumpridaEm: agora,
        cumpridoPor: userId,
        updatedAt: agora,
      })
      .where(eq(tarefaInterna.id, id));

    const nomeExecutor = await nomeUsuario(userId);
    const [pr] = await db
      .select({ numeroProcesso: prazos.numeroProcesso })
      .from(prazos)
      .where(eq(prazos.id, row.prazoId))
      .limit(1);
    const msg = montarMsgTarefaCumprida({
      titulo: row.titulo,
      dataLimite: String(row.dataLimite),
      numeroProcesso: pr?.numeroProcesso ?? null,
      nomeExecutor,
    });
    await notificarDestinatarioTarefa("cumprida", msg, row.idCriador, {
      tarefaInternaId: id,
      prazoId: row.prazoId,
    });

    const [updated] = await db.select().from(tarefaInterna).where(eq(tarefaInterna.id, id)).limit(1);
    res.json(await mapRowToApi(updated!));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao concluir tarefa" });
  }
}

/** POST /api/tarefas-internas/:id/cobranca */
export async function postTarefaInternaCobranca(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const [row] = await db.select().from(tarefaInterna).where(eq(tarefaInterna.id, id)).limit(1);
    if (!row) {
      res.status(404).json({ error: "Tarefa não encontrada" });
      return;
    }
    if (row.idCriador !== userId) {
      res.status(403).json({ error: "Apenas quem criou pode cobrar." });
      return;
    }
    if (row.status !== "pendente" || !row.d3EnviadoEm) {
      res.status(409).json({ error: "Cobrança só após o alerta de 3 dias úteis e com tarefa pendente." });
      return;
    }
    const hoje = hojeIsoSaoPaulo();
    if (!dataIsoMenorOuIgual(hoje, String(row.dataLimite))) {
      res.status(409).json({ error: "Prazo da tarefa já vencido; use outro canal se necessário." });
      return;
    }
    if (row.cobrancaUltimaEm) {
      const diff = Date.now() - row.cobrancaUltimaEm.getTime();
      if (diff < 24 * 60 * 60 * 1000) {
        res.status(429).json({ error: "Aguarde 24 horas entre cobranças." });
        return;
      }
    }

    const nomeCriador = await nomeUsuario(userId);
    const msg = montarMsgCobranca({
      titulo: row.titulo,
      dataLimite: String(row.dataLimite),
      nomeCriador,
    });
    await notificarDestinatarioTarefa("cobranca", msg, row.idResponsavel, {
      tarefaInternaId: id,
      prazoId: row.prazoId,
    });
    await db
      .update(tarefaInterna)
      .set({ cobrancaUltimaEm: new Date(), updatedAt: new Date() })
      .where(eq(tarefaInterna.id, id));

    const [updated] = await db.select().from(tarefaInterna).where(eq(tarefaInterna.id, id)).limit(1);
    res.json(await mapRowToApi(updated!));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao enviar cobrança" });
  }
}

/**
 * Chamado pelo scheduler: envia alerta D−3 para criador e responsável.
 * Retorna quantas tarefas notificadas.
 */
export async function processarAlertasD3TarefasInternas(): Promise<number> {
  if (!dentroJanelaAlertaTarefa()) return 0;

  const hoje = hojeIsoSaoPaulo();
  const rows = await db
    .select()
    .from(tarefaInterna)
    .where(and(eq(tarefaInterna.status, "pendente"), isNull(tarefaInterna.d3EnviadoEm)));

  let n = 0;
  for (const row of rows) {
    const lim = String(row.dataLimite);
    if (!dataIsoMenorOuIgual(hoje, lim)) continue;
    const diaAlerta = dataMenosNDiasUteis(lim, 3);
    if (!dataIsoMenorOuIgual(diaAlerta, hoje)) continue;

    const [pr] = await db
      .select({ numeroProcesso: prazos.numeroProcesso })
      .from(prazos)
      .where(eq(prazos.id, row.prazoId))
      .limit(1);

    const nomeCriador = await nomeUsuario(row.idCriador);
    const nomeResponsavel = await nomeUsuario(row.idResponsavel);

    const msgExec = montarMsgAlertaD3({
      titulo: row.titulo,
      dataLimite: lim,
      numeroProcesso: pr?.numeroProcesso ?? null,
      nomeCriador,
      nomeResponsavel,
      paraExecutor: true,
    });
    const msgGest = montarMsgAlertaD3({
      titulo: row.titulo,
      dataLimite: lim,
      numeroProcesso: pr?.numeroProcesso ?? null,
      nomeCriador,
      nomeResponsavel,
      paraExecutor: false,
    });

    const ok1 = await notificarDestinatarioTarefa("alerta_d3", msgExec, row.idResponsavel, {
      tarefaInternaId: row.id,
      prazoId: row.prazoId,
    });
    const ok2 = await notificarDestinatarioTarefa("alerta_d3", msgGest, row.idCriador, {
      tarefaInternaId: row.id,
      prazoId: row.prazoId,
    });

    if (ok1 && ok2) {
      await db
        .update(tarefaInterna)
        .set({ d3EnviadoEm: new Date(), updatedAt: new Date() })
        .where(eq(tarefaInterna.id, row.id));
      n++;
    }
  }
  return n;
}
