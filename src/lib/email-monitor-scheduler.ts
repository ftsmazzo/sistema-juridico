/**
 * Verificação automática de e-mail a cada minuto: para cada conta ativa com intervalo vencido, executa a verificação.
 */
import { db } from "../db/index.js";
import { contaEmailMonitoramento } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { runEmailCheck, isCheckingInProgress } from "./email-monitor-check.js";

const INTERVAL_MS = 60 * 1000;

export function startEmailMonitorScheduler(): void {
  setInterval(async () => {
    try {
      const contas = await db
        .select({
          id: contaEmailMonitoramento.id,
          intervalMinutes: contaEmailMonitoramento.intervalMinutes,
          lastCheckedAt: contaEmailMonitoramento.lastCheckedAt,
        })
        .from(contaEmailMonitoramento)
        .where(eq(contaEmailMonitoramento.ativo, true));
      const now = Date.now();
      for (const conta of contas) {
        if (isCheckingInProgress(conta.id)) continue;
        const last = conta.lastCheckedAt ? conta.lastCheckedAt.getTime() : 0;
        const intervalMs = conta.intervalMinutes * 60 * 1000;
        if (now - last >= intervalMs) {
          await runEmailCheck(conta.id);
        }
      }
    } catch (err) {
      console.error("Email monitor scheduler:", err);
    }
  }, INTERVAL_MS);
}
