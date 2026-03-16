/**
 * Gera o valor criptografado da senha para colar no banco.
 * Use a MESMA chave EMAIL_MONITOR_ENCRYPTION_KEY que está no EasyPanel.
 *
 * Uso:
 *   npm run email-monitor:encrypt "sua-senha-de-app-aqui"
 *   (ou com variável de ambiente: SENHA_APP="xxx" npm run email-monitor:encrypt)
 *
 * Depois rode no PostgreSQL:
 *   UPDATE conta_email_monitoramento
 *   SET password_encrypted = 'VALOR_IMPRESSO_ABAIXO'
 *   WHERE "user" = 'adrianolms@yahoo.com.br';
 */
import "dotenv/config";
import { encryptPassword } from "../lib/email-monitor-encrypt.js";

const senha = process.env.SENHA_APP ?? process.argv[2];
if (!senha || !senha.trim()) {
  console.error("Uso: npm run email-monitor:encrypt \"senha-de-app\"");
  console.error("  ou: SENHA_APP=xxx npm run email-monitor:encrypt");
  process.exit(1);
}

try {
  const encrypted = encryptPassword(senha.trim());
  console.log("Cole o valor abaixo no SQL (password_encrypted):");
  console.log("");
  console.log(encrypted);
  console.log("");
  console.log("Exemplo SQL:");
  console.log(
    "UPDATE conta_email_monitoramento SET password_encrypted = '" +
      encrypted.replace(/'/g, "''") +
      "' WHERE \"user\" = 'adrianolms@yahoo.com.br';"
  );
} catch (err) {
  console.error("Erro:", err instanceof Error ? err.message : err);
  console.error(
    "Confira se EMAIL_MONITOR_ENCRYPTION_KEY está no .env (32 ou 64 caracteres hex)."
  );
  process.exit(1);
}
