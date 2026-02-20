/**
 * Calcula a data do prazo em dias úteis a partir da data de publicação.
 * Considera apenas segunda a sexta.
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
    const dia = data.getDay();
    if (dia !== 0 && dia !== 6) restante--;
  }
  return data;
}

/** Formata Date para YYYY-MM-DD (PostgreSQL date). */
export function formatarDataSql(d: Date): string {
  return d.toISOString().slice(0, 10);
}
