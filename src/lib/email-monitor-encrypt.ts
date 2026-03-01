/**
 * Criptografia da senha da conta de e-mail (IMAP).
 * Usa AES-256-GCM. Chave: EMAIL_MONITOR_ENCRYPTION_KEY (32 ou 64 caracteres hex).
 * Se 32 caracteres, é duplicada para obter 32 bytes.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALG = "aes-256-gcm";
const IV_LEN = 16;
const TAG_LEN = 16;

function getKey(): Buffer {
  const env = process.env.EMAIL_MONITOR_ENCRYPTION_KEY;
  if (!env || !/^[0-9a-fA-F]+$/.test(env)) {
    throw new Error(
      "Criptografia não configurada. Defina EMAIL_MONITOR_ENCRYPTION_KEY (32 ou 64 caracteres hex) no servidor."
    );
  }
  if (env.length === 32) {
    return Buffer.from(env + env, "hex");
  }
  if (env.length === 64) {
    return Buffer.from(env, "hex");
  }
  throw new Error(
    "EMAIL_MONITOR_ENCRYPTION_KEY deve ter 32 ou 64 caracteres hex (ex.: openssl rand -hex 16 ou rand -hex 32)."
  );
}

export function encryptPassword(plain: string): string {
  if (!plain) return "";
  const key = getKey();
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
  try {
    const key = getKey();
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
