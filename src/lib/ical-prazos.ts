/**
 * Gera conteúdo iCalendar (.ics) a partir de uma lista de prazos.
 * Formato: eventos de dia inteiro (VALUE=DATE); compatível com Google, Outlook e Apple.
 */
export type PrazoParaIcs = {
  id: number;
  data: string; // YYYY-MM-DD
  prazo: string;
  tipo: string;
  numeroProcesso: string | null;
  observacao: string | null;
};

const PRODID = "-//Agenda Prazos//AgendaPrazos//PT";

/** Escapa caracteres especiais e dobra linhas longas (RFC 5545: máx 75 octets por linha). */
function foldLine(line: string): string {
  const escaped = line.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  if (escaped.length <= 75) return escaped;
  const parts: string[] = [];
  let rest = escaped;
  while (rest.length > 0) {
    const chunk = rest.slice(0, 75);
    rest = rest.slice(75);
    parts.push(parts.length === 0 ? chunk : "\r\n " + chunk);
  }
  return parts.join("");
}

function formatDateIcs(dateStr: string): string {
  const d = String(dateStr).trim().slice(0, 10);
  return d.replace(/-/g, "");
}

/**
 * Retorna o conteúdo completo do arquivo .ics (VCALENDAR com um VEVENT por prazo).
 */
export function buildIcsFromPrazos(prazos: PrazoParaIcs[], calendarName = "Prazos - Agenda Prazos"): string {
  const now = new Date();
  const dtstamp =
    now.getUTCFullYear() +
    String(now.getUTCMonth() + 1).padStart(2, "0") +
    String(now.getUTCDate()).padStart(2, "0") +
    "T" +
    String(now.getUTCHours()).padStart(2, "0") +
    String(now.getUTCMinutes()).padStart(2, "0") +
    String(now.getUTCSeconds()).padStart(2, "0") +
    "Z";

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:" + PRODID,
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:" + foldLine(calendarName),
    "METHOD:PUBLISH",
  ];

  for (const p of prazos) {
    const dateIcs = formatDateIcs(p.data);
    const nextDay = (() => {
      const [y, m, d] = dateIcs.match(/(\d{4})(\d{2})(\d{2})/)?.slice(1).map(Number) ?? [0, 0, 0];
      const d2 = new Date(y, m - 1, d + 1);
      return (
        d2.getFullYear() +
        String(d2.getMonth() + 1).padStart(2, "0") +
        String(d2.getDate()).padStart(2, "0")
      );
    })();
    const summary = [p.prazo, p.numeroProcesso].filter(Boolean).join(" — ");
    const descParts = [p.tipo, p.numeroProcesso, p.observacao].filter(Boolean);
    const description = descParts.join("\n");

    lines.push("BEGIN:VEVENT");
    lines.push("UID:prazo-" + p.id + "@agendaprazos");
    lines.push("DTSTAMP:" + dtstamp);
    lines.push("DTSTART;VALUE=DATE:" + dateIcs);
    lines.push("DTEND;VALUE=DATE:" + nextDay);
    lines.push("SUMMARY:" + foldLine(summary));
    if (description) lines.push("DESCRIPTION:" + foldLine(description));
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
