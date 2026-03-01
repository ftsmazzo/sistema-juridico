/**
 * Executa uma verificação de e-mail: IMAP → extração Recorte → cria apenas publicações (sem IA).
 * A análise e os prazos ficam para o N8N (botão "Análise com IA").
 */
import { db } from "../db/index.js";
import { contaEmailMonitoramento } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { decryptPassword } from "./email-monitor-encrypt.js";
import { fetchRecentEmails } from "./email-monitor-imap.js";
import { extrairPublicacoesDeEmail } from "./extrator-recorte-email.js";
import { processarItemPublicacaoOab } from "./processar-publicacao-oab.js";

export type CheckResult = {
  ok: boolean;
  publicacoesCriadas: number;
  prazosCriados: number;
  emailsProcessados: number;
  erro?: string;
};

export async function runEmailCheck(contaId?: number): Promise<CheckResult> {
  const [conta] = await db
    .select()
    .from(contaEmailMonitoramento)
    .where(
      contaId != null
        ? eq(contaEmailMonitoramento.id, contaId)
        : eq(contaEmailMonitoramento.ativo, true)
    )
    .limit(1);

  if (!conta || !conta.ativo) {
    return {
      ok: false,
      publicacoesCriadas: 0,
      prazosCriados: 0,
      emailsProcessados: 0,
      erro: contaId ? "Conta não encontrada" : "Nenhuma conta ativa configurada",
    };
  }

  let password = "";
  try {
    password = conta.passwordEncrypted ? decryptPassword(conta.passwordEncrypted) : "";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db
      .update(contaEmailMonitoramento)
      .set({
        lastCheckedAt: new Date(),
        lastError: `Chave de criptografia: ${msg}`,
        updatedAt: new Date(),
      })
      .where(eq(contaEmailMonitoramento.id, conta.id));
    return {
      ok: false,
      publicacoesCriadas: 0,
      prazosCriados: 0,
      emailsProcessados: 0,
      erro: msg,
    };
  }

  const filterFrom =
    Array.isArray(conta.remetentesFiltro) && conta.remetentesFiltro.length > 0
      ? conta.remetentesFiltro
      : undefined;

  try {
    const emails = await fetchRecentEmails(
      {
        host: conta.host,
        port: conta.port,
        secure: conta.secure,
        user: conta.user,
        password,
      },
      filterFrom
    );

    let publicacoesCriadas = 0;
    let prazosCriados = 0;

    for (const email of emails) {
      const itens = extrairPublicacoesDeEmail({
        emailText: email.text,
        emailHtml: email.html,
        subject: email.subject,
        from: email.from,
        to: email.to,
        emailId: email.messageId,
      });
      for (const item of itens) {
        const result = await processarItemPublicacaoOab(item);
        if (result.publicacaoId) {
          publicacoesCriadas++;
          if (result.prazoIds?.length) prazosCriados += result.prazoIds.length;
        }
      }
    }

    await db
      .update(contaEmailMonitoramento)
      .set({
        lastCheckedAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(contaEmailMonitoramento.id, conta.id));

    return {
      ok: true,
      publicacoesCriadas,
      prazosCriados,
      emailsProcessados: emails.length,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db
      .update(contaEmailMonitoramento)
      .set({
        lastCheckedAt: new Date(),
        lastError: msg.slice(0, 500),
        updatedAt: new Date(),
      })
      .where(eq(contaEmailMonitoramento.id, conta.id));
    return {
      ok: false,
      publicacoesCriadas: 0,
      prazosCriados: 0,
      emailsProcessados: 0,
      erro: msg,
    };
  }
}
