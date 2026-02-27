import { Response } from "express";
import pg from "pg";
import type { RequestWithUser } from "../../middleware/auth.js";
import { podeGerenciarUsuarios } from "../../lib/roles.js";

/**
 * POST /api/admin/limpar-dados
 * Apenas Gestor. Zera: prazos, prazos_usuarios, publicações OAB, movimentações,
 * análise IA, audiências, audiências_usuarios, agenda.
 * Mantém: pessoas, usuarios (cadastros do sistema).
 */
export async function limparDados(
  req: RequestWithUser,
  res: Response
): Promise<void> {
  if (!req.user || !podeGerenciarUsuarios(req.user.perfil, req.user.grupo)) {
    res.status(403).json({ error: "Sem permissão. Apenas Gestor." });
    return;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    res.status(503).json({ error: "DATABASE_URL não configurada." });
    return;
  }

  const pool = new pg.Pool({ connectionString: url });
  try {
    await pool.query(`
      TRUNCATE TABLE
        prazos_usuarios,
        prazos,
        audiencias_usuarios,
        audiencias,
        movimentacoes,
        analise_ia_publicacao,
        publicacoes_oab,
        agenda
      RESTART IDENTITY
    `);
    res.json({
      ok: true,
      message: "Dados limpos. Prazos, publicações, audiências e agenda zerados. Usuários e pessoas mantidos.",
    });
  } catch (err) {
    console.error("Limpar dados:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Erro ao limpar dados",
    });
  } finally {
    await pool.end();
  }
}
