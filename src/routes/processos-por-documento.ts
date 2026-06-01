import { Response } from "express";
import type { RequestWithUser } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { processos } from "../db/schema.js";
import { sql } from "drizzle-orm";
import { extrairProcessoDeImagem } from "../lib/extrair-processo-por-ia.js";
import { vincularPublicacoesOrfasAoProcesso } from "../lib/vincular-publicacao-processo.js";
import { normalizarNumeroCnj, formatarCnjParaGravar } from "../lib/normalizar-cnj.js";
import { podeCadastrarPessoas } from "../lib/roles.js";

/**
 * POST /api/processos/por-documento
 * Body: { image: string (base64), provider?, model?, criarSeExistir?: boolean }
 */
export async function processoPorDocumento(
  req: RequestWithUser,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  if (!podeCadastrarPessoas(req.user.perfil, req.user.grupo)) {
    res.status(403).json({ error: "Sem permissão" });
    return;
  }

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
    const numeroCnj = extraido.numeroCnj?.trim();
    if (!numeroCnj) {
      res.status(400).json({
        error: "Não foi possível identificar o número CNJ na imagem. Tente outro print ou preencha manualmente.",
        extraido,
      });
      return;
    }

    const numeroGravar = formatarCnjParaGravar(numeroCnj);
    const cnjNorm = normalizarNumeroCnj(numeroGravar);

    const [existente] = await db
      .select({ id: processos.id, numeroCnj: processos.numeroCnj })
      .from(processos)
      .where(sql`regexp_replace(${processos.numeroCnj}, '\\D', '', 'g') = ${cnjNorm}`)
      .limit(1);

    let processoId: number;
    let criado = false;

    if (existente) {
      processoId = existente.id;
    } else {
      const titulo =
        extraido.nomeCliente && extraido.outroEnvolvido
          ? `${extraido.nomeCliente} x ${extraido.outroEnvolvido}`.slice(0, 400)
          : extraido.nomeCliente?.slice(0, 400) ?? null;

      const [inserted] = await db
        .insert(processos)
        .values({
          numeroCnj: numeroGravar,
          status: (extraido.status ?? "Ativo").slice(0, 30),
          vara: extraido.vara?.slice(0, 120) ?? undefined,
          comarca: extraido.comarca?.slice(0, 120) ?? undefined,
          instancia: extraido.instancia?.slice(0, 80) ?? undefined,
          tipoAcao: extraido.tipoAcao?.slice(0, 120) ?? undefined,
          nomeCliente: extraido.nomeCliente?.slice(0, 255) ?? undefined,
          qualificacaoCliente: extraido.qualificacaoCliente?.slice(0, 60) ?? undefined,
          outroEnvolvido: extraido.outroEnvolvido?.slice(0, 255) ?? undefined,
          qualificacaoOutro: extraido.qualificacaoOutro?.slice(0, 60) ?? undefined,
          valorCausa: extraido.valorCausa?.slice(0, 50) ?? undefined,
          titulo: titulo ?? undefined,
          observacoes: extraido.observacoes ?? undefined,
        })
        .returning({ id: processos.id });
      if (!inserted) {
        res.status(500).json({ error: "Falha ao criar processo." });
        return;
      }
      processoId = inserted.id;
      criado = true;
    }

    const publicacoesVinculadas = await vincularPublicacoesOrfasAoProcesso(
      processoId,
      numeroGravar
    );

    res.status(criado ? 201 : 200).json({
      processoId,
      criado,
      numeroCnj: numeroGravar,
      publicacoesVinculadas,
      extraido,
      message: criado
        ? `Processo cadastrado. ${publicacoesVinculadas} publicação(ões) vinculada(s).`
        : `Processo já existia e foi atualizado. ${publicacoesVinculadas} publicação(ões) vinculada(s).`,
    });
  } catch (err) {
    console.error("processoPorDocumento:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Erro ao extrair processo do documento.",
    });
  }
}
