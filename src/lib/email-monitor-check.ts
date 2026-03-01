/**
 * Executa uma verificação de e-mail: IMAP → extração Recorte → cria publicações.
 * Se WEBHOOK_N8N_ANALISE_PUBLICACAO_URL estiver configurado, dispara a análise com IA para cada
 * publicação criada e grava resumo, movimentações e prazos.
 */
import { db } from "../db/index.js";
import { contaEmailMonitoramento } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { decryptPassword } from "./email-monitor-encrypt.js";
import { fetchRecentEmails } from "./email-monitor-imap.js";
import { extrairPublicacoesDeEmail } from "./extrator-recorte-email.js";
import { processarItemPublicacaoOab } from "./processar-publicacao-oab.js";
import { executarAnaliseN8nParaPublicacao } from "./analise-n8n-publicacao.js";
import { enviarNotificacaoPublicacao, enviarNotificacaoAgrupada } from "./notifica-publicacao.js";

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
    /** Publicações que tiveram análise IA gravada nesta run (para notificação única ou agrupada). */
    const notificarPublicacoes: { publicacaoId: number; prazosCriados: number }[] = [];

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
          if (!result.skipped && process.env.WEBHOOK_N8N_ANALISE_PUBLICACAO_URL?.trim()) {
            const analiseResult = await executarAnaliseN8nParaPublicacao(result.publicacaoId);
            if (analiseResult.analiseGravada) {
              prazosCriados += analiseResult.prazosCriados;
              notificarPublicacoes.push({
                publicacaoId: result.publicacaoId,
                prazosCriados: analiseResult.prazosCriados,
              });
            }
            if (!analiseResult.ok && analiseResult.erro) {
              console.error(`IA publicação ${result.publicacaoId}:`, analiseResult.erro);
            }
          }
        }
      }
    }

    if (notificarPublicacoes.length > 0 && process.env.WEBHOOK_N8N_NOTIFICA?.trim()) {
      const contaOpts = {
        idUsuario: conta.idUsuario ?? undefined,
        numeroOabConta: conta.numeroOab ?? undefined,
      };
      if (notificarPublicacoes.length === 1) {
        enviarNotificacaoPublicacao(
          notificarPublicacoes[0].publicacaoId,
          notificarPublicacoes[0].prazosCriados,
          contaOpts
        ).catch(() => {});
      } else {
        enviarNotificacaoAgrupada(notificarPublicacoes, contaOpts).catch(() => {});
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
