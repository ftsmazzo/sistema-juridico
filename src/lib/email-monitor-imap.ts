/**
 * Busca e-mails recentes via IMAP e retorna lista com subject, from, to, text, html, date, messageId.
 * Usado pelo monitoramento de e-mail (extração Recorte → publicações).
 */
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

export type EmailMessage = {
  messageId: string;
  subject: string;
  from: string;
  to: string;
  date: Date;
  text: string;
  html: string;
};

export type ImapConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
};

const INBOX = "INBOX";
const MAX_MESSAGES = 100;

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

async function streamToBuffer(
  stream: NodeJS.ReadableStream | Buffer
): Promise<Buffer> {
  if (Buffer.isBuffer(stream)) return stream;
  const chunks: Buffer[] = [];
  for await (const c of stream as AsyncIterable<Buffer>) chunks.push(c);
  return Buffer.concat(chunks);
}

/**
 * Conecta ao IMAP, busca as últimas mensagens da caixa de entrada e retorna envelopes + corpo.
 * @param sinceDays - Quantos dias para trás (ex.: 30 = primeira varredura; 3 = verificações seguintes).
 */
export async function fetchRecentEmails(
  config: ImapConfig,
  filterFrom?: string[],
  sinceDays: number = 30
): Promise<EmailMessage[]> {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.password },
    logger: false,
    // Yahoo e outros exigem SNI (servername) no TLS para não dar "Command failed"
    ...(config.secure && config.host
      ? { tls: { servername: config.host } }
      : {}),
  });

  const results: EmailMessage[] = [];

  await client.connect();

  try {
    const lock = await client.getMailboxLock(INBOX);
    try {
      // Data "desde" em UTC (meia-noite), N dias atrás — IMAP usa só o dia; evita perda por fuso.
      const nowUtc = new Date();
      const sinceDate = new Date(Date.UTC(
        nowUtc.getUTCFullYear(),
        nowUtc.getUTCMonth(),
        nowUtc.getUTCDate() - sinceDays,
        0, 0, 0, 0
      ));
      const uids = await client.search({ since: sinceDate }, { uid: true });
      const numericUids = (Array.isArray(uids) ? uids : [])
        .map((u) => (typeof u === "number" ? u : Number(u)))
        .filter((n) => Number.isInteger(n) && n > 0);
      const sorted = [...new Set(numericUids)].sort((a, b) => a - b);
      const totalEncontrados = sorted.length;
      const toFetch = sorted.slice(-MAX_MESSAGES);
      console.log(
        `IMAP: pedido since ${sinceDays} dias (desde ${sinceDate.toISOString().slice(0, 10)}), UIDs no servidor: ${totalEncontrados}, buscando: ${toFetch.length}`
      );
      if (toFetch.length === 0) return results;

      // FETCH por UID: o 3º parâmetro (options) deve ter { uid: true }, senão o servidor trata o range como sequence number e falha.
      // Buscar um por vez (Yahoo e outros rejeitam range; para outros provedores poderia tentar batch depois).
      for (const uid of toFetch) {
        try {
          const msg = await client.fetchOne(uid, { envelope: true, source: true }, { uid: true });
          if (!msg) continue;
          const envelope = msg.envelope;
          if (!envelope) continue;
          const fromAddr = (envelope.from?.[0]?.address ?? "").toLowerCase();
          if (filterFrom && filterFrom.length > 0) {
            const match = filterFrom.some((f) => {
              const ft = f.trim().toLowerCase();
              if (!ft) return true;
              if (ft.startsWith("@")) return fromAddr.endsWith(ft);
              if (ft.includes("@")) return fromAddr.includes(ft) || fromAddr.endsWith(ft.split("@")[1]);
              return fromAddr.includes(ft);
            });
            if (!match) continue;
          }

          if (msg.source == null) continue;
          const raw = await streamToBuffer(msg.source);
          const parsed = await simpleParser(raw);
          const text = asString(parsed.text);
          const html = asString(parsed.html);
          const fromObj = Array.isArray(parsed.from) ? parsed.from[0] : parsed.from;
          const toObj = Array.isArray(parsed.to) ? parsed.to[0] : parsed.to;
          const messageId =
            typeof parsed.messageId === "string" ? parsed.messageId : `uid-${msg.uid}`;
          const subject = typeof parsed.subject === "string" ? parsed.subject : "";
          results.push({
            messageId,
            subject,
            from: asString((fromObj as { text?: unknown } | undefined)?.text) || fromAddr,
            to: asString((toObj as { text?: unknown } | undefined)?.text),
            date: parsed.date ?? new Date(),
            text,
            html,
          });
        } catch (err) {
          const e = err as Error & { response?: { text?: string }; text?: string };
          const serverMsg = e.response?.text ?? e.text ?? "";
          console.warn(
            `IMAP fetch UID ${uid} falhou:`,
            e.message,
            serverMsg ? `— ${String(serverMsg).slice(0, 120)}` : ""
          );
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  if (results.length > 0) {
    const dates = results.map((r) => r.date.getTime());
    const minD = new Date(Math.min(...dates));
    const maxD = new Date(Math.max(...dates));
    console.log(
      `IMAP: e-mails recebidos com datas entre ${minD.toISOString().slice(0, 10)} e ${maxD.toISOString().slice(0, 10)} (${results.length} no total)`
    );
  }
  return results;
}
