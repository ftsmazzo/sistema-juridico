/**
 * Resolve quais prazos "pertencem" a um usuário para calendário/feed:
 * 1) prazos_usuarios (vínculo direto)
 * 2) publicação com mesma OAB (publicacao.numeroOab ou advogados[].oab = usuario/pessoa OAB)
 * 3) publicação vinculada a processo cujo advogado responsável é o usuário
 */
import { db } from "../db/index.js";
import {
  prazos,
  prazosUsuarios,
  usuarios,
  pessoas,
  publicacoesOab,
  processos,
} from "../db/schema.js";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { normalizarOab } from "./processar-publicacao-oab.js";

export type PrazoParaIcs = {
  id: number;
  data: string;
  prazo: string;
  tipo: string;
  numeroProcesso: string | null;
  observacao: string | null;
};

/** Retorna OABs normalizadas do usuário (usuario.numeroOab + pessoa.numeroOab quando houver idPessoa). */
export async function getOabsDoUsuario(userId: number): Promise<Set<string>> {
  const oabs = new Set<string>();
  const [u] = await db
    .select({ numeroOab: usuarios.numeroOab, idPessoa: usuarios.idPessoa })
    .from(usuarios)
    .where(eq(usuarios.id, userId))
    .limit(1);
  if (!u) return oabs;
  const oabU = normalizarOab(u.numeroOab ?? undefined);
  if (oabU) oabs.add(oabU);
  if (u.idPessoa) {
    const [p] = await db
      .select({ numeroOab: pessoas.numeroOab })
      .from(pessoas)
      .where(eq(pessoas.id, u.idPessoa))
      .limit(1);
    const oabP = normalizarOab(p?.numeroOab ?? undefined);
    if (oabP) oabs.add(oabP);
  }
  return oabs;
}

/** Retorna IDs de prazos que pertencem ao usuário (prazos_usuarios + OAB na publicação + processo.advogado). */
export async function getPrazoIdsDoUsuario(userId: number): Promise<number[]> {
  const ids = new Set<number>();

  const fromVinculo = await db
    .select({ idPrazo: prazosUsuarios.idPrazo })
    .from(prazosUsuarios)
    .where(eq(prazosUsuarios.idUsuario, userId));
  fromVinculo.forEach((r) => ids.add(r.idPrazo));

  const oabsUser = await getOabsDoUsuario(userId);
  if (oabsUser.size > 0) {
    const prazosComPub = await db
      .select({
        id: prazos.id,
        numeroOab: publicacoesOab.numeroOab,
        advogados: publicacoesOab.advogados,
      })
      .from(prazos)
      .innerJoin(publicacoesOab, eq(prazos.publicacaoOabId, publicacoesOab.id));
    for (const row of prazosComPub) {
      const oabPub = normalizarOab(row.numeroOab ?? undefined);
      if (oabPub && oabsUser.has(oabPub)) {
        ids.add(row.id);
        continue;
      }
      const advs = row.advogados as { oab?: string }[] | null;
      if (Array.isArray(advs)) {
        for (const a of advs) {
          const oabA = normalizarOab(a?.oab ?? undefined);
          if (oabA && oabsUser.has(oabA)) {
            ids.add(row.id);
            break;
          }
        }
      }
    }
  }

  const prazosDoProcessoDoUsuario = await db
    .select({ id: prazos.id })
    .from(prazos)
    .innerJoin(publicacoesOab, eq(prazos.publicacaoOabId, publicacoesOab.id))
    .innerJoin(processos, eq(publicacoesOab.processoId, processos.id))
    .where(eq(processos.idAdvogadoResponsavel, userId));
  prazosDoProcessoDoUsuario.forEach((r) => ids.add(r.id));

  return Array.from(ids);
}

/**
 * Retorna os prazos do usuário para .ics (por vínculo, OAB da publicação e advogado do processo).
 */
export async function getPrazosDoUsuarioParaIcs(
  userId: number,
  inicio?: string,
  fim?: string
): Promise<PrazoParaIcs[]> {
  const prazoIds = await getPrazoIdsDoUsuario(userId);
  if (prazoIds.length === 0) return [];

  const conditions = [inArray(prazos.id, prazoIds)];
  if (inicio) conditions.push(gte(prazos.data, inicio));
  if (fim) conditions.push(lte(prazos.data, fim));

  const rows = await db
    .select({
      id: prazos.id,
      data: prazos.data,
      prazo: prazos.prazo,
      tipo: prazos.tipo,
      numeroProcesso: prazos.numeroProcesso,
      observacao: prazos.observacao,
    })
    .from(prazos)
    .where(and(...conditions))
    .orderBy(prazos.data, prazos.prazo);

  return rows.map((r) => ({
    id: r.id,
    data: String(r.data),
    prazo: r.prazo,
    tipo: r.tipo,
    numeroProcesso: r.numeroProcesso,
    observacao: r.observacao,
  }));
}
