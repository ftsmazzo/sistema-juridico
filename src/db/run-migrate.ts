import pg from "pg";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Executa todas as migrações em drizzle/*.sql em ordem alfabética.
 * Idempotente: 0000 usa CREATE IF NOT EXISTS; demais usam ADD COLUMN IF NOT EXISTS.
 * Chamado na subida da API (deploy EasyPanel / GitHub).
 */
export async function runMigrations(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("DATABASE_URL não definida; migração ignorada.");
    return;
  }

  const pool = new pg.Pool({ connectionString: url });
  const dir = join(process.cwd(), "drizzle");

  try {
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const file of files) {
      const pathSql = join(dir, file);
      const sql = readFileSync(pathSql, "utf-8");
      await pool.query(sql);
      console.log(`Migração ${file} executada.`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ENOENT")) {
      console.warn("Pasta drizzle/ ou arquivos não encontrados; ignorando.");
      return;
    }
    throw err;
  } finally {
    await pool.end();
  }
}
