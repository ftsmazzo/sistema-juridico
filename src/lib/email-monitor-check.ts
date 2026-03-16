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

/** IDs das contas que estão sendo verificadas agora (para o front mostrar "Verificando..." após F5). */
const checkingInProgressIds = new Set<number>();
export function isCheckingInProgress(contaId: number): boolean {
  return checkingInProgressIds.has(contaId);
}

export async function runEmailCheck(
  contaId?: number,
  options?: { sinceDays?: number }
): Promise<CheckResult> {
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

  // Primeira verificação (nunca rodou): 30 dias. Depois: só últimos 3 dias. options.sinceDays força o período (ex.: 30).
  const sinceDays =
    options?.sinceDays ?? (conta.lastCheckedAt != null ? 3 : 30);

  checkingInProgressIds.add(conta.id);
  try {
    const emails = await fetchRecentEmails(
      {
        host: conta.host,
        port: conta.port,
        secure: conta.secure,
        user: conta.user,
        password,
      },
      filterFrom,
      sinceDays
    );

    console.log(
      `Email check conta ${conta.id} (${conta.user}): ${emails.length} e-mail(s) nos últimos ${sinceDays} dias`
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
      if (itens.length > 0) {
        console.log(`  Recorte encontrado em e-mail "${email.subject?.slice(0, 50)}": ${itens.length} publicação(ões)`);
      }
      const dateEmailIso = email.date instanceof Date ? email.date.toISOString() : undefined;
      for (const item of itens) {
        if (dateEmailIso && !(item as { date?: string }).date) {
          (item as { date?: string }).date = dateEmailIso;
        }
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

    console.log(
      `Email check conta ${conta.id}: ${publicacoesCriadas} publicação(ões) criada(s) a partir de ${emails.length} e-mail(s)`
    );
    return {
      ok: true,
      publicacoesCriadas,
      prazosCriados,
      emailsProcessados: emails.length,
    };
  } catch (err) {
    console.error("Email monitor check erro:", err);
    const msg = formatEmailCheckError(err);
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
  } finally {
    checkingInProgressIds.delete(conta.id);
  }
}

/** Monta mensagem clara a partir do erro (IMAP costuma vir só "Command failed"). */
function formatEmailCheckError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const e = err as Error & {
    code?: string;
    response?: { text?: string; value?: string };
    text?: string;
    responseText?: string;
    source?: string;
  };
  let msg = e.message;
  if (e.code && typeof e.code === "string") msg += ` [${e.code}]`;
  const serverText =
    e.response?.text ?? e.response?.value ?? e.text ?? e.responseText ?? e.source;
  if (serverText && typeof serverText === "string" && serverText.trim()) {
    msg += " — " + serverText.trim().slice(0, 250);
  }
  if (msg === "Command failed" || (msg.startsWith("Command failed") && !msg.includes("—"))) {
    msg += ". Verifique: senha de app correta (Yahoo); conta ativa; Remetentes vazio para aceitar todos.";
  }
  return msg;
}
