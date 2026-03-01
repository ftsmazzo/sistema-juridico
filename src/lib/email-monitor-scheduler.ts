/**
 * Verificação automática de e-mail a cada minuto: se a conta ativa está com intervalo vencido, executa a verificação.
 */
import { db } from "../db/index.js";
import { contaEmailMonitoramento } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { runEmailCheck } from "./email-monitor-check.js";

const INTERVAL_MS = 60 * 1000;

export function startEmailMonitorScheduler(): void {
  setInterval(async () => {
    try {
      const [conta] = await db
        .select({ id: contaEmailMonitoramento.id, intervalMinutes: contaEmailMonitoramento.intervalMinutes, lastCheckedAt: contaEmailMonitoramento.lastCheckedAt })
        .from(contaEmailMonitoramento)
        .where(eq(contaEmailMonitoramento.ativo, true))
        .limit(1);
      if (!conta) return;
      const now = Date.now();
      const last = conta.lastCheckedAt ? conta.lastCheckedAt.getTime() : 0;
      const intervalMs = conta.intervalMinutes * 60 * 1000;
      if (now - last >= intervalMs) {
        await runEmailCheck(conta.id);
      }
    } catch (err) {
      console.error("Email monitor scheduler:", err);
    }
  }, INTERVAL_MS);
}
