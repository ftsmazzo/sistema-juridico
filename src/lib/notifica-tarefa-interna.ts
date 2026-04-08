/**
 * WhatsApp (N8N / Evolution) para tarefas internas.
 * WEBHOOK_N8N_TAREFAS_INTERNAS_URL — POST JSON com event + msg + numeroEnvio + metadados.
 */
import { buscarTelefonePorUsuarioId } from "./notifica-publicacao.js";

export const TAREFA_INTERNA_EVENTOS = [
  "criada",
  "cumprida",
  "alerta_d3",
  "cobranca",
] as const;
export type TarefaInternaEvento = (typeof TAREFA_INTERNA_EVENTOS)[number];

export const TAREFA_INTERNA_TIPOS = [
  "reuniao_cliente",
  "atualizacao_calculo",
  "audiencia_avisar_cliente",
  "email_cliente",
  "outro",
] as const;
export type TarefaInternaTipo = (typeof TAREFA_INTERNA_TIPOS)[number];

const LABEL_TIPO: Record<string, string> = {
  reuniao_cliente: "Reunião com cliente",
  atualizacao_calculo: "Atualização de cálculo/planilha",
  audiencia_avisar_cliente: "Audiência — avisar cliente",
  email_cliente: "E-mail ao cliente",
  outro: "Outro",
};

function labelTipo(t: string): string {
  return LABEL_TIPO[t] ?? t;
}

function formatarDataBr(iso: string | null | undefined): string {
  if (!iso) return "";
  const s = String(iso).trim();
  const isoM = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (isoM) return `${isoM[3]}/${isoM[2]}/${isoM[1]}`;
  return s;
}

export function montarMsgTarefaCriada(d: {
  titulo: string;
  tipo: string;
  dataLimite: string;
  numeroProcesso: string | null;
  nomeCriador: string;
  nomeResponsavel: string;
  descricao?: string | null;
}): string {
  const linhas = [
    "📌 *Nova tarefa interna*",
    "",
    `*Título:* ${d.titulo}`,
    `*Tipo:* ${labelTipo(d.tipo)}`,
    `*Limite:* ${formatarDataBr(d.dataLimite)}`,
  ];
  if (d.numeroProcesso) linhas.push(`*Processo (prazo):* ${d.numeroProcesso}`);
  linhas.push(`*Designada por:* ${d.nomeCriador}`);
  linhas.push(`*Responsável:* ${d.nomeResponsavel}`);
  if (d.descricao?.trim()) linhas.push("", d.descricao.trim().slice(0, 400));
  linhas.push("", "_Sistema Agenda Prazos_");
  return linhas.join("\n");
}

export function montarMsgTarefaCumprida(d: {
  titulo: string;
  dataLimite: string;
  numeroProcesso: string | null;
  nomeExecutor: string;
}): string {
  const linhas = [
    "✅ *Tarefa interna concluída*",
    "",
    `*Título:* ${d.titulo}`,
    `*Limite era:* ${formatarDataBr(d.dataLimite)}`,
  ];
  if (d.numeroProcesso) linhas.push(`*Processo:* ${d.numeroProcesso}`);
  linhas.push(`*Concluída por:* ${d.nomeExecutor}`);
  linhas.push("", "_Sistema Agenda Prazos_");
  return linhas.join("\n");
}

export function montarMsgAlertaD3(d: {
  titulo: string;
  dataLimite: string;
  numeroProcesso: string | null;
  nomeCriador: string;
  nomeResponsavel: string;
  paraExecutor: boolean;
}): string {
  const linhas = [
    "⏳ *Lembrete: tarefa interna (3 dias úteis)*",
    "",
    `*Título:* ${d.titulo}`,
    `*Vence em:* ${formatarDataBr(d.dataLimite)}`,
  ];
  if (d.numeroProcesso) linhas.push(`*Processo:* ${d.numeroProcesso}`);
  linhas.push(`*Responsável:* ${d.nomeResponsavel}`);
  linhas.push(`*Designada por:* ${d.nomeCriador}`);
  if (d.paraExecutor) {
    linhas.push("", "Por favor providencie ou envie retorno ao escritório.");
  } else {
    linhas.push("", "Acompanhe com o responsável se necessário.");
  }
  linhas.push("", "_Sistema Agenda Prazos_");
  return linhas.join("\n");
}

export function montarMsgCobranca(d: {
  titulo: string;
  dataLimite: string;
  nomeCriador: string;
}): string {
  return [
    "🔔 *Cobrança — tarefa interna*",
    "",
    `*Título:* ${d.titulo}`,
    `*Prazo da tarefa:* ${formatarDataBr(d.dataLimite)}`,
    `*Solicitado por:* ${d.nomeCriador}`,
    "",
    "Precisamos de retorno sobre esta providência o quanto antes.",
    "",
    "_Sistema Agenda Prazos_",
  ].join("\n");
}

export async function enviarWebhookTarefaInterna(payload: {
  event: TarefaInternaEvento;
  msg: string;
  numeroEnvio: string;
  tarefaInternaId: number;
  prazoId: number;
  destinatarioUsuarioId: number;
}): Promise<boolean> {
  const url = process.env.WEBHOOK_N8N_TAREFAS_INTERNAS_URL?.trim();
  if (!url) {
    console.warn("WEBHOOK_N8N_TAREFAS_INTERNAS_URL não configurada; tarefa interna não notificada.");
    return false;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error("Webhook tarefa interna:", payload.event, res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("Webhook tarefa interna:", payload.event, e);
    return false;
  }
}

export async function notificarDestinatarioTarefa(
  event: TarefaInternaEvento,
  msg: string,
  destinatarioUsuarioId: number,
  meta: { tarefaInternaId: number; prazoId: number }
): Promise<boolean> {
  const numeroEnvio = await buscarTelefonePorUsuarioId(destinatarioUsuarioId);
  if (!numeroEnvio) return false;
  return enviarWebhookTarefaInterna({
    event,
    msg,
    numeroEnvio,
    tarefaInternaId: meta.tarefaInternaId,
    prazoId: meta.prazoId,
    destinatarioUsuarioId,
  });
}
