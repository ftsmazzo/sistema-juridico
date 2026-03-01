/**
 * Envia notificação (WhatsApp via N8N/Evolution) após gravar análise e prazos de uma publicação.
 * POST no WEBHOOK_N8N_NOTIFICA com payload contendo "msg" formatada para o nó Evolution.
 */
import { db } from "../db/index.js";
import { publicacoesOab, prazos } from "../db/schema.js";
import { eq, asc } from "drizzle-orm";

const MAX_MSG_LENGTH = 1000;

function truncar(s: string | null | undefined, max: number): string {
  if (s == null || s === "") return "";
  const t = String(s).trim();
  return t.length > max ? t.slice(0, max) + "…" : t;
}

/**
 * Monta a mensagem formatada para WhatsApp (campo msg do nó Evolution).
 */
function montarMensagem(dados: {
  numeroProcesso: string | null;
  tipoPublicacao: string | null;
  dataPublicacao: string | null;
  resumo: string | null;
  prazoDiasUteisSugerido: number | null;
  prazosCriados: number;
  listaPrazos: { prazo: string; data: string }[];
  advogadoPrincipal: string | null;
}): string {
  const linhas: string[] = [];
  linhas.push("📋 *Nova publicação processada*");
  linhas.push("");
  if (dados.numeroProcesso) {
    linhas.push(`*Processo:* ${dados.numeroProcesso}`);
  }
  if (dados.tipoPublicacao) {
    linhas.push(`*Tipo:* ${dados.tipoPublicacao}`);
  }
  if (dados.dataPublicacao) {
    linhas.push(`*Data pub.:* ${dados.dataPublicacao}`);
  }
  if (dados.advogadoPrincipal) {
    linhas.push(`*Adv.:* ${truncar(dados.advogadoPrincipal, 60)}`);
  }
  linhas.push("");
  if (dados.resumo) {
    const resumo = truncar(dados.resumo, 280);
    linhas.push(`*Resumo:* ${resumo}`);
    linhas.push("");
  }
  if (dados.prazosCriados > 0) {
    linhas.push(`⏱ *${dados.prazosCriados} prazo(s) criado(s)*`);
    if (dados.prazoDiasUteisSugerido != null) {
      linhas.push(`(${dados.prazoDiasUteisSugerido} dias úteis)`);
    }
    if (dados.listaPrazos.length > 0) {
      for (const p of dados.listaPrazos.slice(0, 5)) {
        linhas.push(`• ${truncar(p.prazo, 80)} → ${p.data}`);
      }
      if (dados.listaPrazos.length > 5) {
        linhas.push(`… e mais ${dados.listaPrazos.length - 5}`);
      }
    }
    linhas.push("");
  }
  linhas.push("_Agenda Prazos_");
  const msg = linhas.join("\n").trim();
  return msg.length > MAX_MSG_LENGTH ? msg.slice(0, MAX_MSG_LENGTH) + "…" : msg;
}

export type PayloadNotificacao = {
  msg: string;
  publicacaoId: number;
  prazosCriados: number;
  numeroProcesso?: string | null;
  tipoPublicacao?: string | null;
  dataPublicacao?: string | null;
};

/**
 * Carrega dados da publicação e prazos, monta o payload e envia para WEBHOOK_N8N_NOTIFICA.
 * Não lança erro; falhas são apenas logadas.
 */
export async function enviarNotificacaoPublicacao(
  publicacaoId: number,
  prazosCriados: number
): Promise<void> {
  const url = process.env.WEBHOOK_N8N_NOTIFICA;
  if (!url || !url.trim()) return;

  try {
    const [row] = await db
      .select({
        numeroProcesso: publicacoesOab.numeroProcesso,
        tipoPublicacao: publicacoesOab.tipoPublicacao,
        dataPublicacao: publicacoesOab.dataPublicacao,
        resumo: publicacoesOab.resumo,
        prazoDiasUteisSugerido: publicacoesOab.prazoDiasUteisSugerido,
        advogadoPrincipal: publicacoesOab.advogadoPrincipal,
      })
      .from(publicacoesOab)
      .where(eq(publicacoesOab.id, publicacaoId))
      .limit(1);

    if (!row) return;

    const listaPrazos: { prazo: string; data: string }[] = [];
    if (prazosCriados > 0) {
      const prazosRows = await db
        .select({ prazo: prazos.prazo, data: prazos.data })
        .from(prazos)
        .where(eq(prazos.publicacaoOabId, publicacaoId))
        .orderBy(asc(prazos.data));
      for (const p of prazosRows) {
        listaPrazos.push({
          prazo: p.prazo ?? "",
          data: p.data ?? "",
        });
      }
    }

    const msg = montarMensagem({
      numeroProcesso: row.numeroProcesso,
      tipoPublicacao: row.tipoPublicacao,
      dataPublicacao: row.dataPublicacao,
      resumo: row.resumo,
      prazoDiasUteisSugerido: row.prazoDiasUteisSugerido,
      prazosCriados,
      listaPrazos,
      advogadoPrincipal: row.advogadoPrincipal,
    });

    const payload: PayloadNotificacao = {
      msg,
      publicacaoId,
      prazosCriados,
      numeroProcesso: row.numeroProcesso,
      tipoPublicacao: row.tipoPublicacao,
      dataPublicacao: row.dataPublicacao,
    };

    const response = await fetch(url.trim(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error("Notificação N8N:", response.status, await response.text().catch(() => ""));
    }
  } catch (err) {
    console.error("Enviar notificação publicação:", publicacaoId, err);
  }
}
