/**
 * Lógica compartilhada para processar um item de publicação OAB:
 * grava publicação, análise IA, movimentações, prazos e vínculos com usuários.
 * Usado pelo webhook (N8N) e pelo cadastro por print.
 *
 * Prazos só são criados quando o item já traz dados de IA (resumo, baseLegal, observacoesIa ou movimentacoes).
 * Se o webhook enviar apenas extração regex (sem IA), a publicação é gravada mas nenhum prazo é criado;
 * quando a análise da IA chegar depois (ex.: botão "Análise com IA" ou PATCH), criarPrazosAPartirDePublicacao
 * é chamado e os prazos são criados/atualizados a partir da IA.
 */
import { db } from "../db/index.js";
import {
  publicacoesOab,
  movimentacoes,
  analiseIaPublicacao,
  prazos,
  prazosUsuarios,
  usuarios,
  pessoas,
  processos,
} from "../db/schema.js";
import { eq, and, inArray } from "drizzle-orm";
import type { ItemPublicacaoOab } from "./publicacoes-oab.types.js";
import {
  adicionarDiasUteis,
  formatarDataSql,
} from "./calcular-prazo.js";

const DIAS_UTEIS_PRAZO_INTIMACAO = 15;

/** Trunca string ao máximo permitido pelo varchar; evita "value too long" no banco. */
function v(s: string | null | undefined, max: number): string | null {
  if (s == null || s === "") return null;
  const t = String(s).trim();
  return t.length > max ? t.slice(0, max) : t;
}

/** Formato canônico para comparação: sem espaços, traços ou barras; maiúsculo. Ex: "SP 123", "SP/123", "SP-123" → "SP123". */
export function normalizarOab(oab: string | undefined): string | null {
  if (!oab || !oab.trim()) return null;
  return oab
    .replace(/\s/g, "")
    .replace(/[-/]/g, "")
    .trim()
    .toUpperCase();
}

/** Mescla advogados por OAB normalizada; evita duplicatas. */
function mergeAdvogados(
  existentes: { nome?: string; oab?: string }[] | null,
  novoPrincipal?: string,
  novoOab?: string,
  novosAdvogados?: { nome?: string; oab?: string }[]
): { nome: string; oab: string }[] {
  const byOab = new Map<string, { nome: string; oab: string }>();
  (existentes ?? []).forEach((a) => {
    const oabNorm = normalizarOab(a.oab);
    if (oabNorm && a.nome) byOab.set(oabNorm, { nome: a.nome.trim(), oab: (a.oab ?? "").trim() });
  });
  if (novoPrincipal && novoOab) {
    const oabNorm = normalizarOab(novoOab);
    if (oabNorm) byOab.set(oabNorm, { nome: novoPrincipal.trim(), oab: novoOab.trim() });
  }
  (novosAdvogados ?? []).forEach((a) => {
    const oabNorm = normalizarOab(a.oab);
    if (oabNorm && a.nome) byOab.set(oabNorm, { nome: a.nome.trim(), oab: (a.oab ?? "").trim() });
  });
  return Array.from(byOab.values());
}

/** Quando a mesma publicação chega de outro e-mail (outro advogado): enriquece sem sobrescrever nem duplicar. */
async function enriquecerPublicacaoExistente(
  publicacaoId: number,
  item: ItemPublicacaoOab
): Promise<void> {
  const [row] = await db
    .select()
    .from(publicacoesOab)
    .where(eq(publicacoesOab.id, publicacaoId))
    .limit(1);
  if (!row) return;

  const advogadosAtuais = (row.advogados ?? []) as { nome?: string; oab?: string }[];
  const advogadosMerged = mergeAdvogados(
    advogadosAtuais,
    item.advogado,
    item.numeroOab,
    item.advogados
  );

  const fontesAtuais = (row.fontesEmail ?? []) as { emailId?: string; from?: string; to?: string }[];
  const jaTemEmail = fontesAtuais.some((f) => f.emailId === item.emailId);
  const fontesMerged = jaTemEmail
    ? fontesAtuais
    : [...fontesAtuais, { emailId: item.emailId, from: item.from, to: item.to }];

  await db
    .update(publicacoesOab)
    .set({
      advogados: advogadosMerged.length ? advogadosMerged : null,
      fontesEmail: fontesMerged,
    })
    .where(eq(publicacoesOab.id, publicacaoId));
}

export async function processarItemPublicacaoOab(
  item: ItemPublicacaoOab
): Promise<{ publicacaoId?: number; prazoIds?: number[]; skipped?: string; criadaAgora?: boolean }> {
  if (!item.isRecorteDigital || item.publicacaoNumero == null) {
    return {};
  }

  const numeroProcesso = item.numeroProcesso ?? "";
  const identificadorDocumento = item.identificadorDocumento ?? "";
  const emailId = item.emailId;
  const publicacaoNumero = item.publicacaoNumero;

  const [existente] = await db
    .select({ id: publicacoesOab.id })
    .from(publicacoesOab)
    .where(
      and(
        eq(publicacoesOab.emailId, emailId),
        eq(publicacoesOab.publicacaoNumero, publicacaoNumero)
      )
    )
    .limit(1);
  if (existente) return { skipped: "duplicada" };

  if (numeroProcesso && identificadorDocumento) {
    const [existenteProcesso] = await db
      .select()
      .from(publicacoesOab)
      .where(
        and(
          eq(publicacoesOab.numeroProcesso, numeroProcesso),
          eq(publicacoesOab.identificadorDocumento, identificadorDocumento)
        )
      )
      .limit(1);
    if (existenteProcesso) {
      await enriquecerPublicacaoExistente(existenteProcesso.id, item);
      return { publicacaoId: existenteProcesso.id, criadaAgora: false };
    }
  }

  const dateEmail = item.date ? new Date(item.date) : null;
  const dataPub = item.dataPublicacao ?? item.dataDisponibilizacao ?? "";

  const [pub] = await db
    .insert(publicacoesOab)
    .values({
      emailId: (emailId || "").slice(0, 255),
      subject: v(item.subject, 500),
      dateEmail,
      fromEmail: v(item.from, 255),
      toEmail: v(item.to, 255),
      advogadoPrincipal: v(item.advogado, 255),
      numeroOab: v(item.numeroOab, 50),
      dataProcessamento: v(item.dataProcessamento, 100),
      totalPublicacoes: item.totalPublicacoes ?? null,
      publicacaoNumero,
      dataDisponibilizacao: v(item.dataDisponibilizacao, 50),
      dataPublicacao: v(item.dataPublicacao, 50),
      jornal: v(item.jornal, 255),
      pagina: v(item.pagina, 50),
      caderno: v(item.caderno, 100),
      local: v(item.local, 500),
      vara: v(item.vara, 500),
      tipoPublicacao: v(item.tipoPublicacao, 100),
      numeroProcesso: v(numeroProcesso || null, 100),
      valorMencionado: v(item.valorMencionado, 100),
      textoCompleto: item.textoCompleto ?? null,
      advogados: item.advogados ?? null,
      poloAtivo: v(item.poloAtivo, 500),
      polosPassivos: item.polosPassivos ?? null,
      urlDocumento: v(item.urlDocumento, 500),
      identificadorDocumento: v(identificadorDocumento || null, 100),
      resumo: item.resumo ?? null,
      baseLegal: v(item.baseLegal, 255),
      prazoDiasUteisSugerido: item.prazoDiasUteisSugerido ?? null,
      observacoesIa: item.observacoesIa ?? null,
      movimentacoes: item.movimentacoes ?? null,
      fontesEmail: [{ emailId: item.emailId ?? undefined, from: item.from, to: item.to }],
    })
    .returning({ id: publicacoesOab.id });

  const publicacaoId = pub?.id;
  if (!publicacaoId) return {};
  const criadaAgora = true;

  const respostaIa = {
    resumo: item.resumo ?? undefined,
    baseLegal: item.baseLegal ?? undefined,
    prazoDiasUteisSugerido: item.prazoDiasUteisSugerido ?? undefined,
    observacoesIa: item.observacoesIa ?? undefined,
    movimentacoes: item.movimentacoes ?? undefined,
  };
  const temDadosIa =
    item.resumo ||
    item.observacoesIa ||
    item.baseLegal ||
    (Array.isArray(item.movimentacoes) && item.movimentacoes.length > 0);

  if (temDadosIa) {
    await db.insert(analiseIaPublicacao).values({
      publicacaoOabId: publicacaoId,
      resumo: item.resumo ?? null,
      observacoesIa: item.observacoesIa ?? null,
      baseLegalGeral: item.baseLegal ?? null,
      respostaCompleta: respostaIa,
    });
  }

  const prazoIds: number[] = [];
  const movs = Array.isArray(item.movimentacoes) ? item.movimentacoes : [];
  const diasSugerido = item.prazoDiasUteisSugerido ?? DIAS_UTEIS_PRAZO_INTIMACAO;

  if (!temDadosIa) {
    const tipoPub = (item.tipoPublicacao ?? "").trim() || "Outros";
    const [movEmail] = await db
      .insert(movimentacoes)
      .values({
        publicacaoOabId: publicacaoId,
        tipo: tipoPub.slice(0, 100),
        resumo: null,
        ordem: 1,
        prazoDiasUteis: null,
        dataLimite: null,
        baseLegal: null,
        fonte: "email",
      })
      .returning({ id: movimentacoes.id });

    const tipoNorm = tipoPub.toLowerCase();
    const ehIntimacaoPub =
      tipoNorm.includes("intimação") || tipoNorm.includes("intimacao");
    if (ehIntimacaoPub && dataPub) {
      const dataLimite = adicionarDiasUteis(dataPub, DIAS_UTEIS_PRAZO_INTIMACAO);
      const dataPrazoStr = formatarDataSql(dataLimite);
      const observacao = [numeroProcesso, item.vara].filter(Boolean).join(" | ");
      const nomePrazo = `Intimação ${numeroProcesso}`.slice(0, 255);
      const [prazo] = await db
        .insert(prazos)
        .values({
          tipo: "civil",
          data: dataPrazoStr,
          observacao,
          conteudo: item.textoCompleto ?? "",
          prazo: nomePrazo,
          status: 0,
          publicacaoOabId: publicacaoId,
          movimentacaoId: movEmail?.id ?? null,
          numeroProcesso: numeroProcesso || null,
        })
        .returning({ id: prazos.id });
      if (prazo?.id) prazoIds.push(prazo.id);
    }

    const oabsPublicacao = new Set<string>();
    if (item.numeroOab) {
      const n = normalizarOab(item.numeroOab);
      if (n) oabsPublicacao.add(n);
    }
    (item.advogados ?? []).forEach((a: { oab?: string }) => {
      const n = normalizarOab(a.oab);
      if (n) oabsPublicacao.add(n);
    });
    const usuariosDoEscritorio = await db
      .select({
        id: usuarios.id,
        numeroOab: usuarios.numeroOab,
        pessoaOab: pessoas.numeroOab,
      })
      .from(usuarios)
      .leftJoin(pessoas, eq(usuarios.idPessoa, pessoas.id))
      .where(eq(usuarios.ativo, true));
    const idsParaVincular = new Set<number>();
    for (const u of usuariosDoEscritorio) {
      const oabUser = normalizarOab(u.numeroOab ?? undefined);
      const oabPessoa = normalizarOab(u.pessoaOab ?? undefined);
      if ((oabUser && oabsPublicacao.has(oabUser)) || (oabPessoa && oabsPublicacao.has(oabPessoa))) {
        idsParaVincular.add(u.id);
      }
    }
    if (numeroProcesso) {
      const [proc] = await db
        .select({ idAdvogadoResponsavel: processos.idAdvogadoResponsavel })
        .from(processos)
        .where(eq(processos.numeroCnj, numeroProcesso))
        .limit(1);
      if (proc?.idAdvogadoResponsavel) idsParaVincular.add(proc.idAdvogadoResponsavel);
    }
    if (idsParaVincular.size === 0) usuariosDoEscritorio.forEach((u) => idsParaVincular.add(u.id));
    for (const pid of prazoIds) {
      for (const idUsuario of idsParaVincular) {
        await db.insert(prazosUsuarios).values({
          idPrazo: pid,
          idUsuario,
        });
      }
    }
    return {
      publicacaoId,
      prazoIds: prazoIds.length > 0 ? prazoIds : undefined,
      criadaAgora,
    };
  }

  for (let ordem = 0; ordem < movs.length; ordem++) {
    const mov = movs[ordem];
    const tipo = (mov?.tipo ?? "").trim() || "Outros";
    const resumoMov = typeof mov?.resumo === "string" ? mov.resumo : null;
    const ehIntimacao =
      tipo.toLowerCase().includes("intimação") || tipo.toLowerCase().includes("intimacao");
    const diasUteis = ehIntimacao ? diasSugerido : 0;
    const dataLimite =
      diasUteis > 0 && dataPub
        ? formatarDataSql(adicionarDiasUteis(dataPub, diasUteis))
        : null;

    const [movInserted] = await db
      .insert(movimentacoes)
      .values({
        publicacaoOabId: publicacaoId,
        tipo: tipo.slice(0, 100),
        resumo: resumoMov,
        ordem: ordem + 1,
        prazoDiasUteis: diasUteis > 0 ? diasUteis : null,
        dataLimite: dataLimite ?? null,
        baseLegal: v(item.baseLegal, 255),
        fonte: "ia",
      })
      .returning({ id: movimentacoes.id });

    if (ehIntimacao && movInserted?.id && dataLimite) {
      const observacao = [numeroProcesso, item.vara].filter(Boolean).join(" | ");
      const nomePrazo = `${tipo} ${numeroProcesso}`.slice(0, 255);
      const [prazo] = await db
        .insert(prazos)
        .values({
          tipo: "civil",
          data: dataLimite,
          observacao,
          conteudo: item.textoCompleto ?? resumoMov ?? "",
          prazo: nomePrazo,
          status: 0,
          publicacaoOabId: publicacaoId,
          movimentacaoId: movInserted.id,
          numeroProcesso: numeroProcesso || null,
        })
        .returning({ id: prazos.id });
      if (prazo?.id) prazoIds.push(prazo.id);
    }
  }

  if (prazoIds.length === 0 && movs.length === 0) {
    const tipoNorm = (item.tipoPublicacao ?? "").toLowerCase();
    const ehIntimacaoPub =
      tipoNorm.includes("intimação") || tipoNorm.includes("intimacao");
    if (ehIntimacaoPub && dataPub) {
      const dataLimite = adicionarDiasUteis(dataPub, DIAS_UTEIS_PRAZO_INTIMACAO);
      const dataPrazoStr = formatarDataSql(dataLimite);
      const observacao = [numeroProcesso, item.vara].filter(Boolean).join(" | ");
      const nomePrazo = `Intimação ${numeroProcesso}`.slice(0, 255);
      const [prazo] = await db
        .insert(prazos)
        .values({
          tipo: "civil",
          data: dataPrazoStr,
          observacao,
          conteudo: item.textoCompleto ?? "",
          prazo: nomePrazo,
          status: 0,
          publicacaoOabId: publicacaoId,
          numeroProcesso: numeroProcesso || null,
        })
        .returning({ id: prazos.id });
      if (prazo?.id) prazoIds.push(prazo.id);
    }
  }

  const oabsPublicacao = new Set<string>();
  if (item.numeroOab) {
    const n = normalizarOab(item.numeroOab);
    if (n) oabsPublicacao.add(n);
  }
  (item.advogados ?? []).forEach((a: { oab?: string }) => {
    const n = normalizarOab(a.oab);
    if (n) oabsPublicacao.add(n);
  });

  const usuariosDoEscritorio = await db
    .select({
      id: usuarios.id,
      numeroOab: usuarios.numeroOab,
      pessoaOab: pessoas.numeroOab,
    })
    .from(usuarios)
    .leftJoin(pessoas, eq(usuarios.idPessoa, pessoas.id))
    .where(eq(usuarios.ativo, true));
  const idsParaVincular = new Set<number>();
  for (const u of usuariosDoEscritorio) {
    const oabUser = normalizarOab(u.numeroOab ?? undefined);
    const oabPessoa = normalizarOab(u.pessoaOab ?? undefined);
    if ((oabUser && oabsPublicacao.has(oabUser)) || (oabPessoa && oabsPublicacao.has(oabPessoa))) {
      idsParaVincular.add(u.id);
    }
  }
  if (numeroProcesso) {
    const [proc] = await db
      .select({ idAdvogadoResponsavel: processos.idAdvogadoResponsavel })
      .from(processos)
      .where(eq(processos.numeroCnj, numeroProcesso))
      .limit(1);
    if (proc?.idAdvogadoResponsavel) idsParaVincular.add(proc.idAdvogadoResponsavel);
  }
  if (idsParaVincular.size === 0) usuariosDoEscritorio.forEach((u) => idsParaVincular.add(u.id));
  for (const pid of prazoIds) {
    for (const idUsuario of idsParaVincular) {
      await db.insert(prazosUsuarios).values({
        idPrazo: pid,
        idUsuario,
      });
    }
  }

  return {
    publicacaoId,
    prazoIds: prazoIds.length > 0 ? prazoIds : undefined,
    criadaAgora,
  };
}

/**
 * Cria movimentações e prazos a partir dos dados de IA já gravados na publicação.
 * Usado quando a análise da IA chega depois (ex.: botão "Análise com IA" ou PATCH com resumo/movimentacoes).
 * Remove prazos/movimentações existentes desta publicação e recria a partir do JSON de IA.
 */
export async function criarPrazosAPartirDePublicacao(
  publicacaoId: number
): Promise<{ prazoIds: number[] }> {
  const [row] = await db
    .select()
    .from(publicacoesOab)
    .where(eq(publicacoesOab.id, publicacaoId))
    .limit(1);
  if (!row) return { prazoIds: [] };

  const movs = Array.isArray(row.movimentacoes) ? row.movimentacoes : [];
  const temDadosIa =
    (row.resumo && row.resumo.trim()) ||
    (row.observacoesIa && row.observacoesIa.trim()) ||
    (row.baseLegal && row.baseLegal.trim()) ||
    movs.length > 0;
  if (!temDadosIa) return { prazoIds: [] };

  await db.delete(prazos).where(eq(prazos.publicacaoOabId, publicacaoId));
  await db.delete(movimentacoes).where(eq(movimentacoes.publicacaoOabId, publicacaoId));

  const prazoIds: number[] = [];
  const diasSugerido = row.prazoDiasUteisSugerido ?? DIAS_UTEIS_PRAZO_INTIMACAO;
  let dataPub = row.dataPublicacao ?? row.dataDisponibilizacao ?? "";
  if (!dataPub && row.dataProcessamento) {
    const match = String(row.dataProcessamento).match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
    if (match) {
      let d = match[1];
      const parts = d.split("/");
      if (parts[2].length === 2) {
        const ano = parseInt(parts[2], 10);
        parts[2] = ano >= 50 ? `19${parts[2]}` : `20${parts[2]}`;
        d = parts.join("/");
      }
      dataPub = d;
    }
  }
  const numeroProcesso = row.numeroProcesso ?? "";
  const vara = row.vara ?? null;

  for (let ordem = 0; ordem < movs.length; ordem++) {
    const mov = movs[ordem];
    const tipo = (mov?.tipo ?? "").trim() || "Outros";
    const resumoMov = typeof mov?.resumo === "string" ? mov.resumo : null;
    const ehIntimacao =
      tipo.toLowerCase().includes("intimação") || tipo.toLowerCase().includes("intimacao");
    const diasUteis = ehIntimacao ? diasSugerido : 0;
    const dataLimite =
      diasUteis > 0 && dataPub
        ? formatarDataSql(adicionarDiasUteis(dataPub, diasUteis))
        : null;

    const [movInserted] = await db
      .insert(movimentacoes)
      .values({
        publicacaoOabId: publicacaoId,
        tipo: tipo.slice(0, 100),
        resumo: resumoMov,
        ordem: ordem + 1,
        prazoDiasUteis: diasUteis > 0 ? diasUteis : null,
        dataLimite: dataLimite ?? null,
        baseLegal: v(row.baseLegal, 255),
        fonte: "ia",
      })
      .returning({ id: movimentacoes.id });

    if (ehIntimacao && movInserted?.id && dataLimite) {
      const observacao = [numeroProcesso, vara].filter(Boolean).join(" | ");
      const nomePrazo = `${tipo} ${numeroProcesso}`.slice(0, 255);
      const [prazo] = await db
        .insert(prazos)
        .values({
          tipo: "civil",
          data: dataLimite,
          observacao,
          conteudo: row.textoCompleto ?? resumoMov ?? "",
          prazo: nomePrazo,
          status: 0,
          publicacaoOabId: publicacaoId,
          movimentacaoId: movInserted.id,
          numeroProcesso: numeroProcesso || null,
          processoId: row.processoId ?? null,
        })
        .returning({ id: prazos.id });
      if (prazo?.id) prazoIds.push(prazo.id);
    }
  }

  if (prazoIds.length === 0 && movs.length === 0) {
    const tipoNorm = (row.tipoPublicacao ?? "").toLowerCase();
    const ehIntimacaoPub =
      tipoNorm.includes("intimação") || tipoNorm.includes("intimacao");
    if (ehIntimacaoPub && dataPub) {
      const dataLimite = adicionarDiasUteis(dataPub, DIAS_UTEIS_PRAZO_INTIMACAO);
      const dataPrazoStr = formatarDataSql(dataLimite);
      const observacao = [numeroProcesso, vara].filter(Boolean).join(" | ");
      const nomePrazo = `Intimação ${numeroProcesso}`.slice(0, 255);
      const [prazo] = await db
        .insert(prazos)
        .values({
          tipo: "civil",
          data: dataPrazoStr,
          observacao,
          conteudo: row.textoCompleto ?? "",
          prazo: nomePrazo,
          status: 0,
          publicacaoOabId: publicacaoId,
          numeroProcesso: numeroProcesso || null,
          processoId: row.processoId ?? null,
        })
        .returning({ id: prazos.id });
      if (prazo?.id) prazoIds.push(prazo.id);
    }
  }

  const oabsPublicacao = new Set<string>();
  if (row.numeroOab) {
    const n = normalizarOab(row.numeroOab);
    if (n) oabsPublicacao.add(n);
  }
  const advogados = row.advogados as { oab?: string }[] | null;
  if (Array.isArray(advogados)) {
    advogados.forEach((a) => {
      const n = normalizarOab(a.oab);
      if (n) oabsPublicacao.add(n);
    });
  }

  const usuariosDoEscritorio = await db
    .select({
      id: usuarios.id,
      numeroOab: usuarios.numeroOab,
      pessoaOab: pessoas.numeroOab,
    })
    .from(usuarios)
    .leftJoin(pessoas, eq(usuarios.idPessoa, pessoas.id))
    .where(eq(usuarios.ativo, true));

  const idsParaVincular = new Set<number>();
  for (const u of usuariosDoEscritorio) {
    const oabUser = normalizarOab(u.numeroOab ?? undefined);
    const oabPessoa = normalizarOab(u.pessoaOab ?? undefined);
    if ((oabUser && oabsPublicacao.has(oabUser)) || (oabPessoa && oabsPublicacao.has(oabPessoa))) {
      idsParaVincular.add(u.id);
    }
  }
  if (row.processoId) {
    const [proc] = await db
      .select({ idAdvogadoResponsavel: processos.idAdvogadoResponsavel })
      .from(processos)
      .where(eq(processos.id, row.processoId))
      .limit(1);
    if (proc?.idAdvogadoResponsavel) idsParaVincular.add(proc.idAdvogadoResponsavel);
  }
  if (idsParaVincular.size === 0) usuariosDoEscritorio.forEach((u) => idsParaVincular.add(u.id));

  for (const pid of prazoIds) {
    for (const idUsuario of idsParaVincular) {
      await db.insert(prazosUsuarios).values({
        idPrazo: pid,
        idUsuario,
      });
    }
  }

  return { prazoIds };
}

/**
 * Backfill: para todos os prazos com publicação OAB, vincula em prazos_usuarios
 * os usuários que batem por OAB (usuário/pessoa) ou por processo (advogado responsável).
 * Útil após deploy para que prazos antigos apareçam no calendário de quem tem OAB/processo.
 */
export async function backfillPrazosUsuarios(): Promise<{ prazosProcessados: number; vinculosInseridos: number }> {
  const prazosComPub = await db
    .select({
      id: prazos.id,
      publicacaoOabId: prazos.publicacaoOabId,
      numeroOab: publicacoesOab.numeroOab,
      advogados: publicacoesOab.advogados,
      processoId: publicacoesOab.processoId,
    })
    .from(prazos)
    .innerJoin(publicacoesOab, eq(prazos.publicacaoOabId, publicacoesOab.id));

  if (prazosComPub.length === 0) return { prazosProcessados: 0, vinculosInseridos: 0 };

  const usuariosDoEscritorio = await db
    .select({
      id: usuarios.id,
      numeroOab: usuarios.numeroOab,
      pessoaOab: pessoas.numeroOab,
    })
    .from(usuarios)
    .leftJoin(pessoas, eq(usuarios.idPessoa, pessoas.id))
    .where(eq(usuarios.ativo, true));

  const existing = await db
    .select({ idPrazo: prazosUsuarios.idPrazo, idUsuario: prazosUsuarios.idUsuario })
    .from(prazosUsuarios)
    .where(inArray(prazosUsuarios.idPrazo, prazosComPub.map((p) => p.id)));
  const existingSet = new Set(existing.map((e) => `${e.idPrazo}-${e.idUsuario}`));

  let vinculosInseridos = 0;
  const byPub = new Map<number, typeof prazosComPub>();
  for (const p of prazosComPub) {
    const pid = p.publicacaoOabId ?? 0;
    if (!byPub.has(pid)) byPub.set(pid, []);
    byPub.get(pid)!.push(p);
  }

  for (const [, prazoList] of byPub) {
    const first = prazoList[0];
    const oabsPublicacao = new Set<string>();
    if (first.numeroOab) {
      const n = normalizarOab(first.numeroOab);
      if (n) oabsPublicacao.add(n);
    }
    const advogados = first.advogados as { oab?: string }[] | null;
    if (Array.isArray(advogados)) {
      advogados.forEach((a) => {
        const n = normalizarOab(a.oab);
        if (n) oabsPublicacao.add(n);
      });
    }
    const idsParaVincular = new Set<number>();
    for (const u of usuariosDoEscritorio) {
      const oabUser = normalizarOab(u.numeroOab ?? undefined);
      const oabPessoa = normalizarOab(u.pessoaOab ?? undefined);
      if ((oabUser && oabsPublicacao.has(oabUser)) || (oabPessoa && oabsPublicacao.has(oabPessoa))) {
        idsParaVincular.add(u.id);
      }
    }
    if (first.processoId) {
      const [proc] = await db
        .select({ idAdvogadoResponsavel: processos.idAdvogadoResponsavel })
        .from(processos)
        .where(eq(processos.id, first.processoId))
        .limit(1);
      if (proc?.idAdvogadoResponsavel) idsParaVincular.add(proc.idAdvogadoResponsavel);
    }
    // Fallback: se não deu para correlacionar por OAB nem por processo, vincula a todos os usuários ativos
    if (idsParaVincular.size === 0) {
      usuariosDoEscritorio.forEach((u) => idsParaVincular.add(u.id));
    }
    for (const row of prazoList) {
      for (const idUsuario of idsParaVincular) {
        const key = `${row.id}-${idUsuario}`;
        if (existingSet.has(key)) continue;
        existingSet.add(key);
        await db.insert(prazosUsuarios).values({ idPrazo: row.id, idUsuario });
        vinculosInseridos++;
      }
    }
  }

  return { prazosProcessados: prazosComPub.length, vinculosInseridos };
}
