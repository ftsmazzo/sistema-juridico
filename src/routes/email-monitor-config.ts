/**
 * GET /api/email-monitor/config — retorna a conta de e-mail (senha não exposta).
 * PUT /api/email-monitor/config — cria ou atualiza a conta (senha opcional; se enviada, criptografada).
 * POST /api/email-monitor/verificar-agora — dispara uma verificação imediata (IMAP → extração → publicações).
 * Requer autenticação.
 */
import { Response } from "express";
import type { RequestWithUser } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { contaEmailMonitoramento } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { encryptPassword } from "../lib/email-monitor-encrypt.js";
import { runEmailCheck } from "../lib/email-monitor-check.js";

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
  createdAt: string;
  updatedAt: string;
};

export async function getEmailMonitorConfig(
  req: RequestWithUser,
  res: Response<ConfigResponse | { error: string }>
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const [row] = await db.select().from(contaEmailMonitoramento).limit(1);
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  res.json({
    id: row.id,
    nome: row.nome,
    host: row.host,
    port: row.port,
    secure: row.secure,
    user: row.user,
    remetentesFiltro: Array.isArray(row.remetentesFiltro) ? row.remetentesFiltro : [],
    intervalMinutes: row.intervalMinutes,
    lastCheckedAt: row.lastCheckedAt ? row.lastCheckedAt.toISOString() : null,
    lastError: row.lastError,
    ativo: row.ativo,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
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

  if (!host || !user) {
    res.status(400).json({ error: "host e user são obrigatórios" });
    return;
  }

  const [existente] = await db.select().from(contaEmailMonitoramento).limit(1);

  try {
    if (existente) {
      const update: Record<string, unknown> = {
        nome,
        host,
        port,
        secure,
        user,
        remetentesFiltro,
        intervalMinutes,
        ativo,
        updatedAt: new Date(),
      };
      if (passwordPlain) {
        update.passwordEncrypted = encryptPassword(passwordPlain);
      }
      const [updated] = await db
        .update(contaEmailMonitoramento)
        .set(update as Record<string, string | number | boolean | string[] | Date | null>)
        .where(eq(contaEmailMonitoramento.id, existente.id))
        .returning();
      if (!updated) {
        res.status(500).json({ error: "Erro ao atualizar configuração" });
        return;
      }
      res.json({
        id: updated.id,
        nome: updated.nome,
        host: updated.host,
        port: updated.port,
        secure: updated.secure,
        user: updated.user,
        remetentesFiltro: Array.isArray(updated.remetentesFiltro) ? updated.remetentesFiltro : [],
        intervalMinutes: updated.intervalMinutes,
        lastCheckedAt: updated.lastCheckedAt ? updated.lastCheckedAt.toISOString() : null,
        lastError: updated.lastError,
        ativo: updated.ativo,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      });
      return;
    }

    const passwordEncrypted = passwordPlain ? encryptPassword(passwordPlain) : null;
    const [inserted] = await db
      .insert(contaEmailMonitoramento)
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
      })
      .returning();
    if (!inserted) {
      res.status(500).json({ error: "Erro ao criar configuração" });
      return;
    }
    res.json({
      id: inserted.id,
      nome: inserted.nome,
      host: inserted.host,
      port: inserted.port,
      secure: inserted.secure,
      user: inserted.user,
      remetentesFiltro: Array.isArray(inserted.remetentesFiltro) ? inserted.remetentesFiltro : [],
      intervalMinutes: inserted.intervalMinutes,
      lastCheckedAt: null,
      lastError: null,
      ativo: inserted.ativo,
      createdAt: inserted.createdAt.toISOString(),
      updatedAt: inserted.updatedAt.toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("EMAIL_MONITOR_ENCRYPTION_KEY")) {
      res.status(503).json({
        error:
          "Criptografia não configurada. Defina EMAIL_MONITOR_ENCRYPTION_KEY (64 caracteres hex) no servidor.",
      });
      return;
    }
    res.status(500).json({ error: msg });
  }
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

  const result = await runEmailCheck();
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
