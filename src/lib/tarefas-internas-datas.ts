import { isDiaUtilIsoBr } from "./feriados.js";

function addCalendarDaysIso(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() + delta);
  const y2 = t.getUTCFullYear();
  const m2 = String(t.getUTCMonth() + 1).padStart(2, "0");
  const d2 = String(t.getUTCDate()).padStart(2, "0");
  return `${y2}-${m2}-${d2}`;
}

/** Hoje em America/Sao_Paulo como YYYY-MM-DD. */
export function hojeIsoSaoPaulo(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

/** Hora 0–23 em America/Sao_Paulo. */
export function horaAtualSaoPaulo(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const h = parts.find((p) => p.type === "hour")?.value;
  return parseInt(h ?? "0", 10);
}

/** Janela de disparo do alerta D−3 (9h ≤ h < 14h em SP). */
export function dentroJanelaAlertaTarefa(now = new Date()): boolean {
  const h = horaAtualSaoPaulo(now);
  return h >= 9 && h < 14;
}

/**
 * Retrocede N dias úteis (BR: seg–sex, feriados em feriados.ts) a partir de dataLimite.
 * dataLimite em YYYY-MM-DD. Retorna YYYY-MM-DD do dia de alerta (D−N úteis).
 */
export function dataMenosNDiasUteis(dataLimiteIso: string, n: number): string {
  let cur = dataLimiteIso;
  let restante = n;
  while (restante > 0) {
    cur = addCalendarDaysIso(cur, -1);
    if (isDiaUtilIsoBr(cur)) restante--;
  }
  return cur;
}

/** Comparação YYYY-MM-DD: a <= b */
export function dataIsoMenorOuIgual(a: string, b: string): boolean {
  return a <= b;
}
