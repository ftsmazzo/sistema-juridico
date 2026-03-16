/**
 * Senha da conta de e-mail (IMAP).
 * Se EMAIL_MONITOR_ENCRYPTION_KEY estiver definida: usa AES-256-GCM (mais seguro).
 * Se não estiver: grava em base64 com prefixo "plain:" para funcionar sem configurar nada.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALG = "aes-256-gcm";
const IV_LEN = 16;
const TAG_LEN = 16;
const PLAIN_PREFIX = "plain:";

function getKey(): Buffer | null {
  const env = process.env.EMAIL_MONITOR_ENCRYPTION_KEY;
  if (!env || !/^[0-9a-fA-F]+$/.test(env)) return null;
  if (env.length === 32) return Buffer.from(env + env, "hex");
  if (env.length === 64) return Buffer.from(env, "hex");
  return null;
}

export function encryptPassword(plain: string): string {
  if (!plain) return "";
  const key = getKey();
  if (!key) {
    return PLAIN_PREFIX + Buffer.from(plain, "utf8").toString("base64");
  }
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key, iv);
  const enc = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  return Buffer.concat([iv, enc]).toString("base64");
}

export function decryptPassword(encrypted: string): string {
  if (!encrypted) return "";
  if (encrypted.startsWith(PLAIN_PREFIX)) {
    try {
      return Buffer.from(encrypted.slice(PLAIN_PREFIX.length), "base64").toString("utf8");
    } catch {
      return "";
    }
  }
  try {
    const key = getKey();
    if (!key) return "";
    const buf = Buffer.from(encrypted, "base64");
    if (buf.length < IV_LEN + TAG_LEN + 1) return "";
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(buf.length - TAG_LEN);
    const enc = buf.subarray(IV_LEN, buf.length - TAG_LEN);
    const decipher = createDecipheriv(ALG, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(enc) + decipher.final("utf8");
  } catch {
    return "";
  }
}
