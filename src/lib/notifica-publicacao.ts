/**
 * Envia notificação (WhatsApp via N8N/Evolution) após gravar análise e prazos de uma publicação.
 * POST no WEBHOOK_N8N_NOTIFICA com payload: msg (formatada), numeroEnvio (5516999999999), etc.
 */
import { db } from "../db/index.js";
import { publicacoesOab, prazos, usuarios, pessoas } from "../db/schema.js";
import { eq, asc } from "drizzle-orm";
import { normalizarOab } from "./processar-publicacao-oab.js";

const MAX_MSG_LENGTH = 1000;
const ASSINATURA = "Agente Juridico L&N";

function truncar(s: string | null | undefined, max: number): string {
  if (s == null || s === "") return "";
  const t = String(s).trim();
  return t.length > max ? t.slice(0, max) + "…" : t;
}

/** Converte data ISO/BR (2026-03-10 ou 10/03/2026) para DD/MM/YYYY. */
function formatarDataBr(val: string | Date | null | undefined): string {
  if (val == null) return "";
  const s = typeof val === "string" ? val.trim() : val.toISOString().slice(0, 10);
  if (!s) return "";
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s);
  if (br) return `${br[1].padStart(2, "0")}/${br[2].padStart(2, "0")}/${br[3].length === 2 ? "20" + br[3] : br[3]}`;
  return s;
}

/**
 * Formata celular do sistema (16)99999-9999 para 5516999999999 (Evolution/WhatsApp).
 */
function formatarNumeroParaEvolution(celular: string | null | undefined): string | null {
  if (celular == null || !String(celular).trim()) return null;
  const digits = String(celular).replace(/\D/g, "");
  if (digits.length === 0) return null;
  if (digits.length === 11 && digits.startsWith("0")) return null;
  if (digits.length === 12 || digits.length === 13) {
    if (digits.startsWith("55")) return digits;
  }
  if (digits.length === 10 || digits.length === 11) return "55" + digits;
  return null;
}

/**
 * Busca telefone (celular) do usuário/pessoa pelo número OAB (normalizado).
 * Consulta usuarios.numeroOab e, se houver idPessoa, pessoas.numeroOab; usa celular do usuário ou da pessoa.
 * Retorna número formatado 5516999999999 ou null.
 */
async function buscarTelefonePorOab(numeroOab: string | null | undefined): Promise<string | null> {
  if (!numeroOab || !String(numeroOab).trim()) return null;
  const oabNorm = normalizarOab(numeroOab);
  if (!oabNorm) return null;

  const users = await db
    .select({
      numeroOab: usuarios.numeroOab,
      celular: usuarios.celular,
      idPessoa: usuarios.idPessoa,
    })
    .from(usuarios)
    .where(eq(usuarios.ativo, true));

  for (const u of users) {
    const oabUsuario = normalizarOab(u.numeroOab ?? undefined);
    if (oabUsuario === oabNorm) {
      let cel = formatarNumeroParaEvolution(u.celular);
      if (cel) return cel;
      if (u.idPessoa) {
        const [pessoa] = await db
          .select({ numeroOab: pessoas.numeroOab, celular: pessoas.celular })
          .from(pessoas)
          .where(eq(pessoas.id, u.idPessoa!))
          .limit(1);
        if (pessoa) {
          cel = formatarNumeroParaEvolution(pessoa.celular);
          if (cel) return cel;
        }
      }
    }
  }

  for (const u of users) {
    if (!u.idPessoa) continue;
    const [pessoa] = await db
      .select({ numeroOab: pessoas.numeroOab, celular: pessoas.celular })
      .from(pessoas)
      .where(eq(pessoas.id, u.idPessoa!))
      .limit(1);
    if (pessoa && normalizarOab(pessoa.numeroOab ?? undefined) === oabNorm) {
      const cel = formatarNumeroParaEvolution(pessoa.celular);
      if (cel) return cel;
    }
  }

  return null;
}

/**
 * Dado uma publicação, retorna a primeira OAB a tentar (principal ou advogados).
 */
function oabsDaPublicacao(row: {
  numeroOab: string | null;
  advogados?: { oab?: string }[] | null;
}): string[] {
  const out: string[] = [];
  if (row.numeroOab?.trim()) out.push(row.numeroOab.trim());
  const advs = row.advogados;
  if (Array.isArray(advs)) {
    for (const a of advs) {
      if (a?.oab?.trim() && !out.includes(a.oab.trim())) out.push(a.oab.trim());
    }
  }
  return out;
}

/**
 * Monta a mensagem formatada para WhatsApp (campo msg do nó Evolution).
 * listaPrazos: data já em formato BR (DD/MM/YYYY).
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
  titulo?: string;
}): string {
  const linhas: string[] = [];
  linhas.push(dados.titulo ?? "📋 *Nova publicação processada*");
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
  linhas.push(`_${ASSINATURA}_`);
  const msg = linhas.join("\n").trim();
  return msg.length > MAX_MSG_LENGTH ? msg.slice(0, MAX_MSG_LENGTH) + "…" : msg;
}

export type PayloadNotificacao = {
  msg: string;
  publicacaoId?: number;
  prazosCriados: number;
  numeroProcesso?: string | null;
  tipoPublicacao?: string | null;
  dataPublicacao?: string | null;
  /** Número para envio no Evolution (5516999999999). */
  numeroEnvio?: string | null;
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
        numeroOab: publicacoesOab.numeroOab,
        advogados: publicacoesOab.advogados,
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
          data: formatarDataBr(p.data),
        });
      }
    }

    let numeroEnvio: string | null = null;
    for (const oab of oabsDaPublicacao(row)) {
      numeroEnvio = await buscarTelefonePorOab(oab);
      if (numeroEnvio) break;
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
      numeroEnvio: numeroEnvio ?? null,
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

/** Dados de uma publicação para mensagem agrupada. */
type PubParaAgrupada = {
  id: number;
  numeroProcesso: string | null;
  tipoPublicacao: string | null;
  dataPublicacao: string | null;
  resumo: string | null;
  prazoDiasUteisSugerido: number | null;
  advogadoPrincipal: string | null;
  numeroOab: string | null;
  advogados: { oab?: string }[] | null;
  prazosCriados: number;
  listaPrazos: { prazo: string; data: string }[];
};

const MAX_MSG_AGRUPADA = 3000;

/**
 * Monta uma única mensagem com várias publicações (ex.: várias do mesmo e-mail).
 */
function montarMensagemAgrupada(publicacoes: PubParaAgrupada[]): string {
  const linhas: string[] = [];
  const total = publicacoes.length;
  linhas.push(`📋 *${total} publicação(ões) processada(s)*`);
  linhas.push("");
  for (let i = 0; i < publicacoes.length; i++) {
    const p = publicacoes[i];
    if (total > 1) {
      linhas.push(`——— *${i + 1}/${total}* ———`);
      linhas.push("");
    }
    if (p.numeroProcesso) linhas.push(`*Processo:* ${p.numeroProcesso}`);
    if (p.tipoPublicacao) linhas.push(`*Tipo:* ${p.tipoPublicacao}`);
    if (p.dataPublicacao) linhas.push(`*Data pub.:* ${p.dataPublicacao}`);
    if (p.advogadoPrincipal) linhas.push(`*Adv.:* ${truncar(p.advogadoPrincipal, 50)}`);
    if (p.resumo) linhas.push(`*Resumo:* ${truncar(p.resumo, 180)}`);
    if (p.prazosCriados > 0) {
      linhas.push(`⏱ ${p.prazosCriados} prazo(s)`);
      for (const pr of p.listaPrazos.slice(0, 3)) {
        linhas.push(`  • ${truncar(pr.prazo, 60)} → ${pr.data}`);
      }
      if (p.listaPrazos.length > 3) linhas.push(`  … e mais ${p.listaPrazos.length - 3}`);
    }
    linhas.push("");
  }
  linhas.push(`_${ASSINATURA}_`);
  const msg = linhas.join("\n").trim();
  return msg.length > MAX_MSG_AGRUPADA ? msg.slice(0, MAX_MSG_AGRUPADA) + "…" : msg;
}

/**
 * Envia uma única notificação agrupando várias publicações (evita várias msgs seguidas).
 * numeroEnvio: primeiro telefone encontrado por OAB entre as publicações.
 */
export async function enviarNotificacaoAgrupada(
  itens: { publicacaoId: number; prazosCriados: number }[]
): Promise<void> {
  const url = process.env.WEBHOOK_N8N_NOTIFICA;
  if (!url || !url.trim() || itens.length === 0) return;

  try {
    const publicacoes: PubParaAgrupada[] = [];
    for (const { publicacaoId, prazosCriados } of itens) {
      const [row] = await db
        .select({
          numeroProcesso: publicacoesOab.numeroProcesso,
          tipoPublicacao: publicacoesOab.tipoPublicacao,
          dataPublicacao: publicacoesOab.dataPublicacao,
          resumo: publicacoesOab.resumo,
          prazoDiasUteisSugerido: publicacoesOab.prazoDiasUteisSugerido,
          advogadoPrincipal: publicacoesOab.advogadoPrincipal,
          numeroOab: publicacoesOab.numeroOab,
          advogados: publicacoesOab.advogados,
        })
        .from(publicacoesOab)
        .where(eq(publicacoesOab.id, publicacaoId))
        .limit(1);
      if (!row) continue;

      const listaPrazos: { prazo: string; data: string }[] = [];
      if (prazosCriados > 0) {
        const prazosRows = await db
          .select({ prazo: prazos.prazo, data: prazos.data })
          .from(prazos)
          .where(eq(prazos.publicacaoOabId, publicacaoId))
          .orderBy(asc(prazos.data));
        for (const p of prazosRows) {
          listaPrazos.push({ prazo: p.prazo ?? "", data: formatarDataBr(p.data) });
        }
      }
      publicacoes.push({
        id: publicacaoId,
        numeroProcesso: row.numeroProcesso,
        tipoPublicacao: row.tipoPublicacao,
        dataPublicacao: row.dataPublicacao,
        resumo: row.resumo,
        prazoDiasUteisSugerido: row.prazoDiasUteisSugerido,
        advogadoPrincipal: row.advogadoPrincipal,
        numeroOab: row.numeroOab,
        advogados: row.advogados as { oab?: string }[] | null,
        prazosCriados,
        listaPrazos,
      });
    }

    if (publicacoes.length === 0) return;

    let numeroEnvio: string | null = null;
    for (const p of publicacoes) {
      for (const oab of oabsDaPublicacao(p)) {
        numeroEnvio = await buscarTelefonePorOab(oab);
        if (numeroEnvio) break;
      }
      if (numeroEnvio) break;
    }

    const msg = montarMensagemAgrupada(publicacoes);
    const totalPrazos = publicacoes.reduce((s, p) => s + p.prazosCriados, 0);

    const payload: PayloadNotificacao = {
      msg,
      prazosCriados: totalPrazos,
      numeroEnvio: numeroEnvio ?? null,
    };

    const response = await fetch(url.trim(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error("Notificação N8N (agrupada):", response.status, await response.text().catch(() => ""));
    }
  } catch (err) {
    console.error("Enviar notificação agrupada:", err);
  }
}
