/**
 * Sugestão de checklist (subtarefas) para um prazo via IA.
 * Envia contexto: publicação (resumo, texto), movimentação, e dados do processo quando vinculado.
 */
import { db } from "../db/index.js";
import {
  prazos,
  publicacoesOab,
  movimentacoes,
  processos,
  movimentacoesProcesso,
} from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

export type SugestaoItem = { titulo: string };

export type ResultadoSugestao = {
  ok: boolean;
  itens: SugestaoItem[];
  erro?: string;
};

/** Resposta esperada do N8N: { itens: [ { titulo: string }, ... ] } ou array de strings */
function extrairItensDaResposta(body: unknown): SugestaoItem[] {
  if (Array.isArray(body)) {
    return body
      .filter((x) => typeof x === "string" && x.trim())
      .map((titulo) => ({ titulo: String(titulo).trim().slice(0, 500) }));
  }
  if (body && typeof body === "object" && "itens" in body) {
    const itens = (body as { itens?: unknown }).itens;
    if (!Array.isArray(itens)) return [];
    return itens
      .filter((x) => x && typeof x === "object" && "titulo" in x)
      .map((x) => ({
        titulo: String((x as { titulo: unknown }).titulo).trim().slice(0, 500),
      }))
      .filter((x) => x.titulo.length > 0);
  }
  return [];
}

/** Sugestões genéricas quando o webhook não está configurado, baseadas no tipo de movimentação */
function sugestoesFallback(movTipo: string | null, tipoPrazo: string): SugestaoItem[] {
  const t = (movTipo ?? "").toLowerCase();
  const base = [
    { titulo: "Revisar publicação e prazos" },
    { titulo: "Elaborar peça ou providência necessária" },
    { titulo: "Revisar documentação e anexos" },
    { titulo: "Protocolar no sistema do tribunal" },
    { titulo: "Conferir protocolo e acompanhar conclusão" },
  ];
  if (t.includes("intimação") || t.includes("intimacao")) {
    return [
      { titulo: "Ler a íntegra da intimação" },
      { titulo: "Elaborar peça (contestação, manifestação, etc.)" },
      { titulo: "Reunir documentos e comprovantes" },
      { titulo: "Revisar peça e prazos" },
      { titulo: "Protocolar dentro do prazo" },
    ];
  }
  if (t.includes("decisão") || t.includes("decisao")) {
    return [
      { titulo: "Ler a decisão na íntegra" },
      { titulo: "Avaliar recurso ou cumprimento" },
      { titulo: "Preparar recurso ou manifestação (se cabível)" },
      { titulo: "Protocolar no prazo (se aplicável)" },
    ];
  }
  if (t.includes("audiência") || t.includes("audiencia")) {
    return [
      { titulo: "Conferir data, hora e local" },
      { titulo: "Preparar documentos e alegações" },
      { titulo: "Comunicar cliente" },
      { titulo: "Comparecer ou justificar ausência" },
    ];
  }
  return base;
}

/**
 * Monta o contexto do prazo (publicação + processo) e chama o webhook N8N para sugerir itens de checklist.
 * Se o webhook não estiver configurado, retorna sugestões genéricas baseadas no tipo da movimentação.
 */
export async function sugerirSubtarefasParaPrazo(prazoId: number): Promise<ResultadoSugestao> {
  const [prazoRow] = await db
    .select({
      id: prazos.id,
      prazo: prazos.prazo,
      data: prazos.data,
      tipo: prazos.tipo,
      conteudo: prazos.conteudo,
      numeroProcesso: prazos.numeroProcesso,
      publicacaoOabId: prazos.publicacaoOabId,
      processoId: prazos.processoId,
      resumo: publicacoesOab.resumo,
      textoCompleto: publicacoesOab.textoCompleto,
      vara: publicacoesOab.vara,
      tipoPublicacao: publicacoesOab.tipoPublicacao,
      movTipo: movimentacoes.tipo,
      movResumo: movimentacoes.resumo,
    })
    .from(prazos)
    .leftJoin(publicacoesOab, eq(prazos.publicacaoOabId, publicacoesOab.id))
    .leftJoin(movimentacoes, eq(prazos.movimentacaoId, movimentacoes.id))
    .where(eq(prazos.id, prazoId))
    .limit(1);

  if (!prazoRow) {
    return { ok: false, itens: [], erro: "Prazo não encontrado" };
  }

  let processo: Record<string, unknown> | null = null;
  let ultimasMovimentacoesProcesso: string[] = [];

  if (prazoRow.processoId) {
    const [proc] = await db
      .select({
        numeroCnj: processos.numeroCnj,
        status: processos.status,
        tipo: processos.tipo,
        fase: processos.fase,
        nomeCliente: processos.nomeCliente,
        nomeAdvogado: processos.nomeAdvogado,
        vara: processos.vara,
        comarca: processos.comarca,
        observacoes: processos.observacoes,
        titulo: processos.titulo,
      })
      .from(processos)
      .where(eq(processos.id, prazoRow.processoId))
      .limit(1);

    if (proc) {
      processo = {
        numeroCnj: proc.numeroCnj,
        status: proc.status,
        tipo: proc.tipo,
        fase: proc.fase,
        nomeCliente: proc.nomeCliente,
        nomeAdvogado: proc.nomeAdvogado,
        vara: proc.vara,
        comarca: proc.comarca,
        observacoes: proc.observacoes ? String(proc.observacoes).slice(0, 500) : null,
        titulo: proc.titulo,
      };

      const movs = await db
        .select({
          movimentacao: movimentacoesProcesso.movimentacao,
          dataMovimentacao: movimentacoesProcesso.dataMovimentacao,
        })
        .from(movimentacoesProcesso)
        .where(eq(movimentacoesProcesso.idProcesso, prazoRow.processoId))
        .orderBy(desc(movimentacoesProcesso.ordem), desc(movimentacoesProcesso.id))
        .limit(5);

      ultimasMovimentacoesProcesso = movs
        .map((m) => {
          const data = m.dataMovimentacao ? String(m.dataMovimentacao) : "";
          const txt = m.movimentacao ? String(m.movimentacao).trim().slice(0, 300) : "";
          return data && txt ? `${data}: ${txt}` : txt || data;
        })
        .filter(Boolean);
    }
  }

  const payload = {
    prazoId: prazoRow.id,
    prazo: prazoRow.prazo,
    data: String(prazoRow.data),
    tipo: prazoRow.tipo,
    conteudo: prazoRow.conteudo ?? null,
    numeroProcesso: prazoRow.numeroProcesso ?? null,
    movimentacaoTipo: prazoRow.movTipo ?? null,
    movimentacaoResumo: prazoRow.movResumo ?? null,
    publicacao: {
      resumo: prazoRow.resumo ?? null,
      textoCompleto: prazoRow.textoCompleto ? String(prazoRow.textoCompleto).slice(0, 4000) : null,
      vara: prazoRow.vara ?? null,
      tipoPublicacao: prazoRow.tipoPublicacao ?? null,
    },
    processo: processo,
    ultimasMovimentacoesProcesso:
      ultimasMovimentacoesProcesso.length > 0 ? ultimasMovimentacoesProcesso : null,
  };

  const url = process.env.WEBHOOK_N8N_SUGESTAO_CHECKLIST?.trim();
  if (!url) {
    const itens = sugestoesFallback(prazoRow.movTipo ?? null, prazoRow.tipo);
    return { ok: true, itens };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        ok: false,
        itens: [],
        erro: `IA respondeu ${response.status}. ${text.slice(0, 200) || ""}`,
      };
    }

    let bodyRes: unknown;
    try {
      bodyRes = await response.json();
    } catch {
      return {
        ok: true,
        itens: sugestoesFallback(prazoRow.movTipo ?? null, prazoRow.tipo),
      };
    }

    const itens = extrairItensDaResposta(bodyRes);
    if (itens.length === 0) {
      return {
        ok: true,
        itens: sugestoesFallback(prazoRow.movTipo ?? null, prazoRow.tipo),
      };
    }
    return { ok: true, itens };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Sugerir subtarefas IA prazo", prazoId, err);
    return {
      ok: false,
      itens: [],
      erro: msg,
    };
  }
}
