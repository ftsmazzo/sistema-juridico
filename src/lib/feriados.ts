/**
 * Feriados nacionais do Brasil (justiça federal / âmbito nacional).
 * Formato: YYYY-MM-DD. Inclui fixos e móveis (Sexta-feira Santa, Corpus Christi, etc.).
 * Atualize a lista ao mudar o ano ou use uma fonte externa (API/banco) no futuro.
 */
const FERIADOS: ReadonlySet<string> = new Set([
  // 2024
  "2024-01-01", "2024-02-12", "2024-02-13", "2024-03-29", "2024-05-01", "2024-05-30",
  "2024-09-07", "2024-10-12", "2024-11-02", "2024-11-15", "2024-11-20", "2024-12-25",
  "2024-04-21",
  // 2025
  "2025-01-01", "2025-02-25", "2025-02-26", "2025-04-18", "2025-04-21", "2025-05-01",
  "2025-06-19", "2025-09-07", "2025-10-12", "2025-11-02", "2025-11-15", "2025-11-20", "2025-12-25",
  // 2026
  "2026-01-01", "2026-02-16", "2026-02-17", "2026-04-03", "2026-04-21", "2026-05-01",
  "2026-06-04", "2026-09-07", "2026-10-12", "2026-11-02", "2026-11-15", "2026-11-20", "2026-12-25",
  // 2027
  "2027-01-01", "2027-02-08", "2027-02-09", "2027-03-26", "2027-04-21", "2027-05-01",
  "2027-05-27", "2027-09-07", "2027-10-12", "2027-11-02", "2027-11-15", "2027-11-20", "2027-12-25",
]);

function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Retorna true se a data for feriado nacional (lista interna). */
export function isFeriado(d: Date): boolean {
  return FERIADOS.has(toKey(d));
}

/** Feriado nacional pela data civil YYYY-MM-DD (calendário Brasil). */
export function isFeriadoIso(isoYmd: string): boolean {
  return FERIADOS.has(isoYmd);
}

/**
 * Dia útil em calendário BR: seg–sex, não feriado nacional.
 * `isoYmd` = YYYY-MM-DD (data civil, independente do fuso do servidor).
 */
export function isDiaUtilIsoBr(isoYmd: string): boolean {
  const [y, m, d] = isoYmd.split("-").map(Number);
  if (!y || !m || !d) return false;
  const instant = new Date(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T15:00:00-03:00`);
  const short = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
  }).format(instant);
  if (short === "Sat" || short === "Sun") return false;
  return !isFeriadoIso(isoYmd);
}

/** Retorna true se for dia útil (não é sábado, domingo nem feriado). */
export function isDiaUtil(d: Date): boolean {
  const dia = d.getDay();
  if (dia === 0 || dia === 6) return false;
  return !isFeriado(d);
}
