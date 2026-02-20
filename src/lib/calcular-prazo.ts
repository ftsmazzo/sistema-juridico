import { isDiaUtil } from "./feriados.js";

/**
 * Calcula a data do prazo em dias úteis a partir da data de publicação.
 * Considera segunda a sexta e exclui feriados nacionais (lista em feriados.ts).
 */
export function adicionarDiasUteis(
  dataStr: string,
  dias: number
): Date {
  const [d, m, a] = dataStr.split("/").map(Number);
  if (!d || !m || !a) return new Date();
  const data = new Date(a, m - 1, d);
  let restante = dias;
  while (restante > 0) {
    data.setDate(data.getDate() + 1);
    if (isDiaUtil(data)) restante--;
  }
  return data;
}

/** Formata Date para YYYY-MM-DD (PostgreSQL date). */
export function formatarDataSql(d: Date): string {
  return d.toISOString().slice(0, 10);
}
