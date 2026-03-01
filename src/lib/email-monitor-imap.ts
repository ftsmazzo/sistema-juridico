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
 */
export async function fetchRecentEmails(
  config: ImapConfig,
  filterFrom?: string[]
): Promise<EmailMessage[]> {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.password },
    logger: false,
  });

  const results: EmailMessage[] = [];

  await client.connect();

  try {
    const lock = await client.getMailboxLock(INBOX);
    try {
      const uids = await client.search(
        { since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        { uid: true }
      );
      const toFetch = Array.isArray(uids) ? uids.slice(-MAX_MESSAGES) : [];
      if (toFetch.length === 0) return results;

      const sequenceSet = toFetch.join(",");
      for await (const msg of client.fetch(sequenceSet, {
        uid: true,
        envelope: true,
        source: true,
      })) {
        const envelope = msg.envelope;
        if (!envelope) continue;
        const fromAddr = envelope.from?.[0]?.address ?? "";
        if (filterFrom && filterFrom.length > 0) {
          const match = filterFrom.some((f) => {
            if (f.startsWith("@")) return fromAddr.toLowerCase().endsWith(f.toLowerCase());
            return fromAddr.toLowerCase().includes(f.toLowerCase());
          });
          if (!match) continue;
        }

        if (msg.source == null) continue;
        const raw = await streamToBuffer(msg.source);
        const parsed = await simpleParser(raw);
        const text = parsed.text ?? "";
        const html = parsed.html ?? "";
        const fromObj = Array.isArray(parsed.from) ? parsed.from[0] : parsed.from;
        const toObj = Array.isArray(parsed.to) ? parsed.to[0] : parsed.to;
        const messageId =
          typeof parsed.messageId === "string" ? parsed.messageId : `uid-${msg.uid}`;
        const subject = typeof parsed.subject === "string" ? parsed.subject : "";
        results.push({
          messageId,
          subject,
          from: (fromObj as { text?: string } | undefined)?.text ?? fromAddr,
          to: (toObj as { text?: string } | undefined)?.text ?? "",
          date: parsed.date ?? new Date(),
          text,
          html,
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return results;
}
