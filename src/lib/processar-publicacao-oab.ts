/**
 * Lógica compartilhada para processar um item de publicação OAB:
 * grava publicação, análise IA, movimentações, prazos e vínculos com usuários.
 * Usado pelo webhook (N8N) e pelo cadastro por print.
 */
import { db } from "../db/index.js";
import {
  publicacoesOab,
  movimentacoes,
  analiseIaPublicacao,
  prazos,
  prazosUsuarios,
  usuarios,
} from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import type { ItemPublicacaoOab } from "./publicacoes-oab.types.js";
import {
  adicionarDiasUteis,
  formatarDataSql,
} from "./calcular-prazo.js";

const DIAS_UTEIS_PRAZO_INTIMACAO = 15;

export function normalizarOab(oab: string | undefined): string | null {
  if (!oab || !oab.trim()) return null;
  return oab.replace(/\s*-\s*/g, "/").trim().toUpperCase();
}

export async function processarItemPublicacaoOab(
  item: ItemPublicacaoOab
): Promise<{ publicacaoId?: number; prazoIds?: number[]; skipped?: string }> {
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
      .select({ id: publicacoesOab.id })
      .from(publicacoesOab)
      .where(
        and(
          eq(publicacoesOab.numeroProcesso, numeroProcesso),
          eq(publicacoesOab.identificadorDocumento, identificadorDocumento)
        )
      )
      .limit(1);
    if (existenteProcesso) return { skipped: "processo_documento_ja_existe" };
  }

  const dateEmail = item.date ? new Date(item.date) : null;
  const dataPub = item.dataPublicacao ?? item.dataDisponibilizacao ?? "";

  const [pub] = await db
    .insert(publicacoesOab)
    .values({
      emailId,
      subject: item.subject ?? null,
      dateEmail,
      fromEmail: item.from ?? null,
      toEmail: item.to ?? null,
      advogadoPrincipal: item.advogado ?? null,
      numeroOab: item.numeroOab ?? null,
      dataProcessamento: item.dataProcessamento ?? null,
      totalPublicacoes: item.totalPublicacoes ?? null,
      publicacaoNumero,
      dataDisponibilizacao: item.dataDisponibilizacao ?? null,
      dataPublicacao: item.dataPublicacao ?? null,
      jornal: item.jornal ?? null,
      pagina: item.pagina ?? null,
      caderno: item.caderno ?? null,
      local: item.local ?? null,
      vara: item.vara ?? null,
      tipoPublicacao: item.tipoPublicacao ?? null,
      numeroProcesso: numeroProcesso || null,
      valorMencionado: item.valorMencionado ?? null,
      textoCompleto: item.textoCompleto ?? null,
      advogados: item.advogados ?? null,
      poloAtivo: item.poloAtivo ?? null,
      polosPassivos: item.polosPassivos ?? null,
      urlDocumento: item.urlDocumento ?? null,
      identificadorDocumento: identificadorDocumento || null,
      resumo: item.resumo ?? null,
      baseLegal: item.baseLegal ?? null,
      prazoDiasUteisSugerido: item.prazoDiasUteisSugerido ?? null,
      observacoesIa: item.observacoesIa ?? null,
      movimentacoes: item.movimentacoes ?? null,
    })
    .returning({ id: publicacoesOab.id });

  const publicacaoId = pub?.id;
  if (!publicacaoId) return {};

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
        tipo,
        resumo: resumoMov,
        ordem: ordem + 1,
        prazoDiasUteis: diasUteis > 0 ? diasUteis : null,
        dataLimite: dataLimite ?? null,
        baseLegal: item.baseLegal ?? null,
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
  (item.advogados ?? []).forEach((a) => {
    const n = normalizarOab(a.oab);
    if (n) oabsPublicacao.add(n);
  });

  const usuariosDoEscritorio = await db
    .select({ id: usuarios.id, numeroOab: usuarios.numeroOab })
    .from(usuarios)
    .where(eq(usuarios.ativo, true));

  for (const pid of prazoIds) {
    for (const u of usuariosDoEscritorio) {
      const oabUser = normalizarOab(u.numeroOab ?? undefined);
      if (oabUser && oabsPublicacao.has(oabUser)) {
        await db.insert(prazosUsuarios).values({
          idPrazo: pid,
          idUsuario: u.id,
        });
      }
    }
  }

  return {
    publicacaoId,
    prazoIds: prazoIds.length > 0 ? prazoIds : undefined,
  };
}
