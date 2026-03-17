/**
 * GET /api/email-monitor/config — retorna a primeira conta (compatibilidade).
 * GET /api/email-monitor/contas — lista todas as contas (senha não exposta).
 * GET /api/email-monitor/contas/:id — retorna uma conta para edição.
 * POST /api/email-monitor/contas — cria nova conta.
 * PUT /api/email-monitor/contas/:id — atualiza conta.
 * DELETE /api/email-monitor/contas/:id — remove conta.
 * POST /api/email-monitor/verificar-agora — body opcional { contaId?: number }; verifica uma conta ou a primeira ativa.
 * Requer autenticação.
 */
import { Response } from "express";
import type { RequestWithUser } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { contaEmailMonitoramento } from "../db/schema.js";
import { eq, asc } from "drizzle-orm";
import { encryptPassword } from "../lib/email-monitor-encrypt.js";
import { runEmailCheck, isCheckingInProgress } from "../lib/email-monitor-check.js";

export type ConfigResponse = {
  id: number;
  nome: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  remetentesFiltro: string[];
  intervalMinutes: number;
  lastCheckedAt: string | null;
  lastError: string | null;
  ativo: boolean;
  /** True enquanto a verificação está rodando no servidor (sobrevive a F5). */
  checkingInProgress?: boolean;
  idUsuario: number | null;
  numeroOab: string | null;
  createdAt: string;
  updatedAt: string;
};

function toConfigResponse(row: {
  id: number;
  nome: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  remetentesFiltro: unknown;
  intervalMinutes: number;
  lastCheckedAt: Date | null;
  lastError: string | null;
  ativo: boolean;
  idUsuario: number | null;
  numeroOab: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ConfigResponse {
  return {
    id: row.id,
    nome: row.nome,
    host: row.host,
    port: row.port,
    secure: row.secure,
    user: row.user,
    remetentesFiltro: Array.isArray(row.remetentesFiltro) ? (row.remetentesFiltro as string[]) : [],
    intervalMinutes: row.intervalMinutes,
    lastCheckedAt: row.lastCheckedAt ? row.lastCheckedAt.toISOString() : null,
    lastError: row.lastError,
    ativo: row.ativo,
    idUsuario: row.idUsuario ?? null,
    numeroOab: row.numeroOab ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getEmailMonitorConfig(
  req: RequestWithUser,
  res: Response<ConfigResponse | { error: string }>
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const [row] = await db
    .select()
    .from(contaEmailMonitoramento)
    .orderBy(asc(contaEmailMonitoramento.id))
    .limit(1);
  if (!row) {
    res.status(200).json({
      id: 0,
      nome: "Conta principal",
      host: "",
      port: 993,
      secure: true,
      user: "",
      remetentesFiltro: [],
      intervalMinutes: 15,
      lastCheckedAt: null,
      lastError: null,
      ativo: false,
      idUsuario: null,
      numeroOab: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  res.json(toConfigResponse(row));
}

/** GET /api/email-monitor/contas — lista todas as contas. */
export async function listContas(
  req: RequestWithUser,
  res: Response<ConfigResponse[] | { error: string }>
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  const rows = await db
    .select()
    .from(contaEmailMonitoramento)
    .orderBy(asc(contaEmailMonitoramento.id));
  res.json(
    rows.map((r) => ({ ...toConfigResponse(r), checkingInProgress: isCheckingInProgress(r.id) }))
  );
}

/** GET /api/email-monitor/contas/:id — uma conta para edição. */
export async function getContaById(
  req: RequestWithUser,
  res: Response<ConfigResponse | { error: string }>
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const [row] = await db
    .select()
    .from(contaEmailMonitoramento)
    .where(eq(contaEmailMonitoramento.id, id))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Conta não encontrada" });
    return;
  }
  res.json(toConfigResponse(row));
}

export async function putEmailMonitorConfig(
  req: RequestWithUser,
  res: Response<ConfigResponse | { error: string }>
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const idBody = body.id != null ? Number(body.id) : null;
  const [existente] = await db
    .select()
    .from(contaEmailMonitoramento)
    .where(idBody != null ? eq(contaEmailMonitoramento.id, idBody) : undefined)
    .orderBy(asc(contaEmailMonitoramento.id))
    .limit(1);
  if (idBody != null && !existente) {
    res.status(404).json({ error: "Conta não encontrada" });
    return;
  }
  return upsertConta(req, res, existente?.id ?? null, body);
}

/** POST /api/email-monitor/contas — cria nova conta. */
export async function postConta(
  req: RequestWithUser,
  res: Response<ConfigResponse | { error: string }>
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  return upsertConta(req, res, null, req.body as Record<string, unknown>);
}

/** PUT /api/email-monitor/contas/:id — atualiza conta. */
export async function putConta(
  req: RequestWithUser,
  res: Response<ConfigResponse | { error: string }>
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const [existente] = await db
    .select()
    .from(contaEmailMonitoramento)
    .where(eq(contaEmailMonitoramento.id, id))
    .limit(1);
  if (!existente) {
    res.status(404).json({ error: "Conta não encontrada" });
    return;
  }
  return upsertConta(req, res, id, req.body as Record<string, unknown>);
}

/** DELETE /api/email-monitor/contas/:id — remove conta. */
export async function deleteConta(
  req: RequestWithUser,
  res: Response<{ ok: boolean } | { error: string }>
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const [row] = await db
    .delete(contaEmailMonitoramento)
    .where(eq(contaEmailMonitoramento.id, id))
    .returning({ id: contaEmailMonitoramento.id });
  if (!row) {
    res.status(404).json({ error: "Conta não encontrada" });
    return;
  }
  res.json({ ok: true });
}

function upsertConta(
  req: RequestWithUser,
  res: Response<ConfigResponse | { error: string }>,
  contaId: number | null,
  body: Record<string, unknown>
): void {
  const nome = typeof body.nome === "string" ? body.nome : "Conta principal";
  const host = typeof body.host === "string" ? body.host.trim() : "";
  const port = typeof body.port === "number" ? body.port : 993;
  const secure = body.secure !== false;
  const user = typeof body.user === "string" ? body.user.trim() : "";
  const passwordPlain = typeof body.password === "string" ? body.password : "";
  const remetentesFiltro = Array.isArray(body.remetentesFiltro)
    ? (body.remetentesFiltro as string[]).filter((x) => typeof x === "string")
    : [];
  const intervalMinutes = typeof body.intervalMinutes === "number" ? body.intervalMinutes : 15;
  const ativo = body.ativo !== false;
  const idUsuario =
    body.idUsuario !== undefined && body.idUsuario !== null && body.idUsuario !== ""
      ? Number(body.idUsuario)
      : null;
  const numeroOab =
    typeof body.numeroOab === "string" ? body.numeroOab.trim() || null : null;

  if (!host || !user) {
    res.status(400).json({ error: "host e user são obrigatórios" });
    return;
  }

  if (contaId != null) {
    const update: Record<string, unknown> = {
      nome,
      host,
      port,
      secure,
      user,
      remetentesFiltro,
      intervalMinutes,
      ativo,
      idUsuario: Number.isInteger(idUsuario) ? idUsuario : null,
      numeroOab,
      updatedAt: new Date(),
    };
    if (passwordPlain) {
      update.passwordEncrypted = encryptPassword(passwordPlain);
    }
    db
      .update(contaEmailMonitoramento)
      .set(update as Record<string, string | number | boolean | string[] | Date | null>)
      .where(eq(contaEmailMonitoramento.id, contaId))
      .returning()
      .then(([updated]) => {
        if (!updated) {
          res.status(500).json({ error: "Erro ao atualizar configuração" });
          return;
        }
        res.json(toConfigResponse(updated));
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({ error: msg });
      });
    return;
  }

  if (!passwordPlain) {
    res.status(400).json({ error: "Senha é obrigatória ao criar nova conta" });
    return;
  }
  const passwordEncrypted = encryptPassword(passwordPlain);
  db.insert(contaEmailMonitoramento)
    .values({
      nome,
      host,
      port,
      secure,
      user,
      passwordEncrypted,
      remetentesFiltro,
      intervalMinutes,
      ativo,
      idUsuario: Number.isInteger(idUsuario) ? idUsuario : null,
      numeroOab,
    })
    .returning()
    .then(([inserted]) => {
      if (!inserted) {
        res.status(500).json({ error: "Erro ao criar configuração" });
        return;
      }
      res.json(toConfigResponse(inserted));
    })
    .catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    });
}

export async function postVerificarAgora(
  req: RequestWithUser,
  res: Response<
    | { ok: boolean; publicacoesCriadas: number; prazosCriados: number; emailsProcessados: number }
    | { error: string }
  >
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const body = (req.body || {}) as { contaId?: number; dias?: number | string };
  const contaId = typeof body.contaId === "number" && Number.isInteger(body.contaId)
    ? body.contaId
    : undefined;
  const diasNum = typeof body.dias === "number" ? body.dias : parseInt(String(body.dias ?? ""), 10);
  const sinceDays = Number.isInteger(diasNum) && diasNum > 0 && diasNum <= 365 ? diasNum : undefined;

  // Ao pedir 30 dias manualmente: zera lastCheckedAt para essa conta, assim a verificação usa 30 dias de fato.
  if (sinceDays === 30 && contaId != null) {
    await db
      .update(contaEmailMonitoramento)
      .set({ lastCheckedAt: null, updatedAt: new Date() })
      .where(eq(contaEmailMonitoramento.id, contaId));
  }

  const result = await runEmailCheck(contaId, sinceDays != null ? { sinceDays } : undefined);
  if (!result.ok && result.erro) {
    res.status(502).json({ error: result.erro });
    return;
  }
  res.json({
    ok: result.ok,
    publicacoesCriadas: result.publicacoesCriadas,
    prazosCriados: result.prazosCriados,
    emailsProcessados: result.emailsProcessados,
  });
}
