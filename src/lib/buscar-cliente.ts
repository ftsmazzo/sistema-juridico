import { db } from "../db/index.js";
import { clientes } from "../db/schema.js";
import { eq, or, ilike, sql, and } from "drizzle-orm";

export type ClienteSugerido = {
  id: number;
  tipo: string;
  nome: string;
  razaoSocial: string | null;
  cpf: string | null;
  cnpj: string | null;
  score: number;
  motivo: string;
};

function apenasDigitos(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

export function normalizarNomeCliente(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function inferirTipoPessoa(nome: string, cnpj?: string | null, cpf?: string | null): "PF" | "PJ" {
  if (cnpj && apenasDigitos(cnpj).length >= 14) return "PJ";
  if (cpf && apenasDigitos(cpf).length >= 11) return "PF";
  const n = nome.toLowerCase();
  if (
    /\b(ltda|s\.?a\.?|me\b|epp|eireli|supermercado|comercio|industria|sociedade)\b/i.test(
      n
    )
  ) {
    return "PJ";
  }
  return "PF";
}

function pontuarMatch(
  candidato: { nome: string; razaoSocial: string | null },
  busca: string
): number {
  const b = normalizarNomeCliente(busca);
  if (!b) return 0;
  const n = normalizarNomeCliente(candidato.nome);
  const r = candidato.razaoSocial ? normalizarNomeCliente(candidato.razaoSocial) : "";
  if (n === b || r === b) return 100;
  if (n.includes(b) || b.includes(n) || (r && (r.includes(b) || b.includes(r)))) return 75;
  const palavras = b.split(" ").filter((p) => p.length > 2);
  if (palavras.length >= 2) {
    const hits = palavras.filter((p) => n.includes(p) || r.includes(p)).length;
    if (hits >= Math.min(2, palavras.length)) return 50 + hits * 5;
  }
  return 0;
}

/**
 * Busca clientes na base por nome, razão social, CPF ou CNPJ.
 */
export async function buscarClientesSugeridos(dados: {
  nome?: string | null;
  cpf?: string | null;
  cnpj?: string | null;
  limite?: number;
}): Promise<ClienteSugerido[]> {
  const limite = dados.limite ?? 8;
  const porId = new Map<number, ClienteSugerido>();

  const add = (
    row: {
      id: number;
      tipo: string;
      nome: string;
      razaoSocial: string | null;
      cpf: string | null;
      cnpj: string | null;
    },
    score: number,
    motivo: string
  ) => {
    const prev = porId.get(row.id);
    if (!prev || score > prev.score) {
      porId.set(row.id, {
        id: row.id,
        tipo: row.tipo,
        nome: row.nome,
        razaoSocial: row.razaoSocial,
        cpf: row.cpf,
        cnpj: row.cnpj,
        score,
        motivo,
      });
    }
  };

  const docCpf = apenasDigitos(dados.cpf);
  const docCnpj = apenasDigitos(dados.cnpj);

  if (docCpf.length >= 11) {
    const rows = await db
      .select()
      .from(clientes)
      .where(
        sql`regexp_replace(coalesce(${clientes.cpf}, ''), '\\D', '', 'g') = ${docCpf}`
      )
      .limit(3);
    for (const r of rows) add(r, 100, "CPF idêntico na base");
  }

  if (docCnpj.length >= 14) {
    const rows = await db
      .select()
      .from(clientes)
      .where(
        sql`regexp_replace(coalesce(${clientes.cnpj}, ''), '\\D', '', 'g') = ${docCnpj}`
      )
      .limit(3);
    for (const r of rows) add(r, 100, "CNPJ idêntico na base");
  }

  const nome = (dados.nome ?? "").trim();
  if (nome.length >= 3) {
    const rows = await db
      .select()
      .from(clientes)
      .where(
        and(
          eq(clientes.ativo, true),
          or(
            ilike(clientes.nome, `%${nome.slice(0, 80)}%`),
            ilike(clientes.razaoSocial, `%${nome.slice(0, 80)}%`)
          )!
        )
      )
      .limit(25);

    for (const r of rows) {
      const score = pontuarMatch(r, nome);
      if (score >= 40) add(r, score, "Nome semelhante na base");
    }
  }

  return Array.from(porId.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limite);
}

export { inferirTipoPessoa };
