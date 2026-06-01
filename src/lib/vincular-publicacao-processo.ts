import { db } from "../db/index.js";
import { publicacoesOab, prazos, processos } from "../db/schema.js";
import { eq, sql, and, isNull } from "drizzle-orm";
import { formatarCnjParaGravar, normalizarNumeroCnj } from "./normalizar-cnj.js";

export type DadosProcessoSugeridos = {
  vara?: string | null;
  comarca?: string | null;
  local?: string | null;
  nomeCliente?: string | null;
  outroEnvolvido?: string | null;
  tipoAcao?: string | null;
  urlDocumento?: string | null;
};

async function buscarProcessoPorCnj(numeroProcesso: string) {
  const cnjNorm = normalizarNumeroCnj(numeroProcesso);
  if (!cnjNorm || cnjNorm.length < 10) return null;

  const [row] = await db
    .select({ id: processos.id, numeroCnj: processos.numeroCnj })
    .from(processos)
    .where(
      sql`regexp_replace(${processos.numeroCnj}, '\\D', '', 'g') = ${cnjNorm}`
    )
    .limit(1);
  return row ?? null;
}

/** Vincula publicação e seus prazos a um processo existente (por número CNJ). */
export async function vincularPublicacaoAoProcesso(
  publicacaoId: number,
  processoId?: number
): Promise<{ processoId: number | null; vinculado: boolean }> {
  const [pub] = await db
    .select({
      id: publicacoesOab.id,
      numeroProcesso: publicacoesOab.numeroProcesso,
      processoId: publicacoesOab.processoId,
    })
    .from(publicacoesOab)
    .where(eq(publicacoesOab.id, publicacaoId))
    .limit(1);
  if (!pub?.numeroProcesso?.trim()) {
    return { processoId: pub?.processoId ?? null, vinculado: false };
  }

  let pid = processoId ?? pub.processoId ?? null;
  if (!pid) {
    const proc = await buscarProcessoPorCnj(pub.numeroProcesso);
    pid = proc?.id ?? null;
  }
  if (!pid) return { processoId: null, vinculado: false };

  await db
    .update(publicacoesOab)
    .set({ processoId: pid })
    .where(eq(publicacoesOab.id, publicacaoId));
  await db
    .update(prazos)
    .set({ processoId: pid })
    .where(eq(prazos.publicacaoOabId, publicacaoId));

  return { processoId: pid, vinculado: true };
}

/** Vincula todas as publicações/prazos órfãos com o mesmo CNJ ao processo. */
export async function vincularPublicacoesOrfasAoProcesso(
  processoId: number,
  numeroCnj: string
): Promise<number> {
  const cnjNorm = normalizarNumeroCnj(numeroCnj);
  if (!cnjNorm) return 0;

  const pubs = await db
    .select({ id: publicacoesOab.id })
    .from(publicacoesOab)
    .where(
      and(
        isNull(publicacoesOab.processoId),
        sql`regexp_replace(${publicacoesOab.numeroProcesso}, '\\D', '', 'g') = ${cnjNorm}`
      )
    );

  for (const p of pubs) {
    await vincularPublicacaoAoProcesso(p.id, processoId);
  }
  return pubs.length;
}

/**
 * Garante que existe processo para o CNJ: vincula se existir ou cria cadastro mínimo.
 */
export async function garantirProcessoParaPublicacao(
  publicacaoId: number,
  opcoes?: { criarSeAusente?: boolean; dados?: DadosProcessoSugeridos }
): Promise<{
  processoId: number | null;
  criado: boolean;
  vinculado: boolean;
}> {
  const [pub] = await db
    .select()
    .from(publicacoesOab)
    .where(eq(publicacoesOab.id, publicacaoId))
    .limit(1);
  if (!pub?.numeroProcesso?.trim()) {
    return { processoId: pub?.processoId ?? null, criado: false, vinculado: false };
  }

  const numeroGravar = formatarCnjParaGravar(pub.numeroProcesso);
  let proc = await buscarProcessoPorCnj(numeroGravar);
  let criado = false;

  if (!proc && opcoes?.criarSeAusente !== false) {
    const dados = opcoes?.dados ?? {};
    const poloAtivo = (pub.poloAtivo ?? dados.nomeCliente ?? "").trim() || null;
    const polosPassivos = Array.isArray(pub.polosPassivos) ? pub.polosPassivos : [];
    const outro =
      (dados.outroEnvolvido ?? polosPassivos[0] ?? "").trim() || null;
    const titulo =
      poloAtivo && outro
        ? `${poloAtivo} x ${outro}`.slice(0, 400)
        : poloAtivo?.slice(0, 400) ?? null;

    const [inserted] = await db
      .insert(processos)
      .values({
        numeroCnj: numeroGravar,
        status: "Ativo",
        vara: (dados.vara ?? pub.vara)?.slice(0, 120) ?? undefined,
        comarca: dados.comarca?.slice(0, 120) ?? (pub.local?.slice(0, 120) || undefined),
        nomeCliente: poloAtivo?.slice(0, 255) ?? undefined,
        outroEnvolvido: outro?.slice(0, 255) ?? undefined,
        tipoAcao: dados.tipoAcao?.slice(0, 120) ?? pub.tipoPublicacao?.slice(0, 120) ?? undefined,
        linkProcesso: dados.urlDocumento?.slice(0, 500) ?? pub.urlDocumento?.slice(0, 500) ?? undefined,
        titulo: titulo ?? undefined,
        observacoes: pub.resumo?.slice(0, 2000) ?? undefined,
      })
      .returning({ id: processos.id });
    if (inserted) {
      proc = { id: inserted.id, numeroCnj: numeroGravar };
      criado = true;
    }
  }

  if (!proc) {
    return { processoId: pub.processoId, criado: false, vinculado: false };
  }

  await vincularPublicacaoAoProcesso(publicacaoId, proc.id);
  await vincularPublicacoesOrfasAoProcesso(proc.id, numeroGravar);

  return { processoId: proc.id, criado, vinculado: true };
}
