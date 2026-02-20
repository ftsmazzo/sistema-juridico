import pg from "pg";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Executa a migração inicial (0000_initial.sql).
 * Idempotente: usa CREATE TABLE IF NOT EXISTS.
 * Chamado na subida da API para criar tabelas automaticamente no deploy.
 */
export async function runMigrations(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("DATABASE_URL não definida; migração ignorada.");
    return;
  }

  const pool = new pg.Pool({ connectionString: url });

  try {
    const pathSql = join(process.cwd(), "drizzle", "0000_initial.sql");
    const sql = readFileSync(pathSql, "utf-8");
    await pool.query(sql);
    console.log("Migração 0000_initial executada.");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ENOENT")) {
      console.warn("Arquivo de migração não encontrado (drizzle/0000_initial.sql); ignorando.");
      return;
    }
    throw err;
  } finally {
    await pool.end();
  }
}
