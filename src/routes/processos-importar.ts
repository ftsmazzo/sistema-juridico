import { Response } from "express";
import type { RequestWithUser } from "../middleware/auth.js";
import { podeCadastrarPessoas } from "../lib/roles.js";
import { importarPlanilhaProcessos } from "../lib/importar-planilha-processos.js";

/**
 * POST /api/processos/importar-excel
 * Body: { fileBase64: string } (arquivo .xlsx em base64, com ou sem prefixo data:...;base64,)
 * Opcional: { importarClientes?: boolean, importarProcessos?: boolean, importarMovimentacoes?: boolean } (default true para todos)
 * Requer autenticação e permissão (gestor/administrativo).
 */
export async function importarExcelProcessos(
  req: RequestWithUser,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  if (!podeCadastrarPessoas(req.user.perfil, req.user.grupo)) {
    res.status(403).json({ error: "Sem permissão para importar. Apenas Gestor ou Administrativo." });
    return;
  }
  const body = req.body as {
    fileBase64?: string;
    importarClientes?: boolean;
    importarProcessos?: boolean;
    importarMovimentacoes?: boolean;
  };
  let base64 = body?.fileBase64;
  if (!base64 || typeof base64 !== "string") {
    res.status(400).json({ error: "Envie o arquivo Excel em base64 no campo 'fileBase64'." });
    return;
  }
  base64 = base64.trim();
  if (base64.startsWith("data:")) {
    const i = base64.indexOf(",");
    if (i !== -1) base64 = base64.slice(i + 1);
  }
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    res.status(400).json({ error: "Conteúdo base64 inválido." });
    return;
  }
  if (buffer.length === 0) {
    res.status(400).json({ error: "Arquivo vazio." });
    return;
  }
  try {
    const resultado = await importarPlanilhaProcessos(buffer, {
      importarClientes: body.importarClientes !== false,
      importarProcessos: body.importarProcessos !== false,
      importarMovimentacoes: body.importarMovimentacoes !== false,
    });
    res.status(200).json({
      message: "Importação concluída.",
      ...resultado,
    });
  } catch (err) {
    console.error("Importar Excel processos:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Erro ao importar planilha.",
    });
  }
}
