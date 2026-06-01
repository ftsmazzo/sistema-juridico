import { Response } from "express";
import type { RequestWithUser } from "../middleware/auth.js";
import { extrairProcessoDeImagem } from "../lib/extrair-processo-por-ia.js";
import {
  prepararCadastroProcesso,
  confirmarCadastroProcesso,
  type ProcessoFormInput,
} from "../lib/cadastrar-processo-com-clientes.js";
import { podeCadastrarPessoas } from "../lib/roles.js";

function checarAuth(req: RequestWithUser, res: Response): boolean {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return false;
  }
  if (!podeCadastrarPessoas(req.user.perfil, req.user.grupo)) {
    res.status(403).json({ error: "Sem permissão" });
    return false;
  }
  return true;
}

/**
 * POST /api/processos/por-documento/extrair
 * Body: { image, provider?, model? }
 * Retorna dados extraídos + sugestões de clientes da base + campos faltantes.
 */
export async function extrairProcessoPorDocumento(
  req: RequestWithUser,
  res: Response
): Promise<void> {
  if (!checarAuth(req, res)) return;

  const body = req.body as {
    image?: string;
    provider?: "openai" | "claude";
    model?: string;
  };
  if (!body?.image || typeof body.image !== "string") {
    res.status(400).json({ error: "Campo image (base64) é obrigatório." });
    return;
  }

  try {
    const extraido = await extrairProcessoDeImagem(body.image, {
      provider: body.provider,
      model: body.model,
    });
    const preparado = await prepararCadastroProcesso(extraido);
    res.json({ ok: true, ...preparado });
  } catch (err) {
    console.error("extrairProcessoPorDocumento:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Erro ao extrair dados do documento.",
    });
  }
}

/**
 * POST /api/processos/por-documento/confirmar
 * Body: ProcessoFormInput (processo + cliente existente ou novo + publicacaoId opcional)
 */
export async function confirmarProcessoPorDocumento(
  req: RequestWithUser,
  res: Response
): Promise<void> {
  if (!checarAuth(req, res)) return;

  const body = req.body as ProcessoFormInput;
  if (!body?.numeroCnj?.trim()) {
    res.status(400).json({ error: "Número CNJ é obrigatório." });
    return;
  }
  if (!body.cliente || (body.cliente.modo !== "existente" && body.cliente.modo !== "novo")) {
    res.status(400).json({ error: "Informe o cliente (existente ou novo)." });
    return;
  }

  try {
    const result = await confirmarCadastroProcesso(body);
    res.status(result.criado ? 201 : 200).json({
      ok: true,
      ...result,
      message: [
        result.criado ? "Processo cadastrado." : "Processo atualizado/vinculado.",
        result.clienteCriado ? "Cliente novo incluído na base." : "",
        `${result.publicacoesVinculadas} publicação(ões) vinculada(s).`,
      ]
        .filter(Boolean)
        .join(" "),
    });
  } catch (err) {
    console.error("confirmarProcessoPorDocumento:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Erro ao confirmar cadastro.",
    });
  }
}

/** @deprecated Use extrair + confirmar. Mantido para compatibilidade rápida. */
export async function processoPorDocumento(
  req: RequestWithUser,
  res: Response
): Promise<void> {
  await extrairProcessoPorDocumento(req, res);
}
