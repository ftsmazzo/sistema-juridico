import { Response } from "express";
import { db } from "../db/index.js";
import { dadosEscavador } from "../db/schema.js";
import { asc, desc, eq, and } from "drizzle-orm";
import type { RequestWithUser } from "../middleware/auth.js";
import { buscarTodasAsPaginasProcessosPorOab } from "../lib/escavador-sincronizar.js";

/** Payload que o N8N envia após o Code organizar a resposta do Escavador */
export type DadosEscavadorPayload = {
  advogado: {
    nome: string;
    oab_uf: string;
    oab_numero: string;
  };
  items: Array<{
    numero_cnj: string;
    data_inicio?: string | null;
    data_ultima_movimentacao?: string | null;
    data_ultima_verificacao?: string | null;
    tribunal_sigla?: string | null;
    comarca?: string | null;
    vara?: string | null;
    classe_processual?: string | null;
    assunto_principal?: string | null;
    area?: string | null;
    status_predito?: string | null;
    titulo_polo_ativo?: string | null;
    titulo_polo_passivo?: string | null;
    valor_causa?: string | null;
    quantidade_movimentacoes?: number | null;
    segredo_justica?: boolean | null;
    processo_principal_numero?: string | null;
    link_processo?: string | null;
    payload_completo?: unknown;
  }>;
};

/** Converte para string YYYY-MM-DD (schema usa date = string) ou null */
function parseDateString(s: string | null | undefined): string | null {
  if (!s || typeof s !== "string") return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** Converte para Date (schema timestamp espera Date) ou null */
function parseTimestampToDate(s: string | null | undefined): Date | null {
  if (!s || typeof s !== "string") return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** Grava payload no banco (upsert). Usado por POST /dados-escavador e por /dados-escavador/sincronizar. */
export async function gravarPayloadDadosEscavador(
  payload: DadosEscavadorPayload
): Promise<{ processados: number; advogadoLabel: string }> {
  const adv = payload.advogado;
  const items = Array.isArray(payload.items) ? payload.items : [];
  let processados = 0;

  for (const item of items) {
    if (!item?.numero_cnj) continue;

    const dataInicio = parseDateString(item.data_inicio);
    const dataUltimaMov = parseDateString(item.data_ultima_movimentacao);
    const dataUltimaVerif = parseTimestampToDate(item.data_ultima_verificacao);

    const row = {
      numeroCnj: item.numero_cnj,
      advogadoNome: adv.nome ?? null,
      advogadoOabUf: adv.oab_uf ?? null,
      advogadoOabNumero: adv.oab_numero ?? null,
      dataInicio: dataInicio ?? undefined,
      dataUltimaMovimentacao: dataUltimaMov ?? undefined,
      dataUltimaVerificacao: dataUltimaVerif ?? undefined,
      tribunalSigla: item.tribunal_sigla ?? null,
      comarca: item.comarca ?? null,
      vara: item.vara ?? null,
      classeProcessual: item.classe_processual ?? null,
      assuntoPrincipal: item.assunto_principal ?? null,
      area: item.area ?? null,
      statusPredito: item.status_predito ?? null,
      tituloPoloAtivo: item.titulo_polo_ativo ?? null,
      tituloPoloPassivo: item.titulo_polo_passivo ?? null,
      valorCausa: item.valor_causa ?? null,
      quantidadeMovimentacoes: item.quantidade_movimentacoes ?? null,
      segredoJustica: item.segredo_justica ?? null,
      processoPrincipalNumero: item.processo_principal_numero ?? null,
      linkProcesso: item.link_processo ?? null,
      payloadCompleto: item.payload_completo ?? null,
      updatedAt: new Date(),
    };

    await db
      .insert(dadosEscavador)
      .values(row)
      .onConflictDoUpdate({
        target: [
          dadosEscavador.numeroCnj,
          dadosEscavador.advogadoOabUf,
          dadosEscavador.advogadoOabNumero,
        ],
        set: {
          dataInicio: row.dataInicio ?? null,
          dataUltimaMovimentacao: row.dataUltimaMovimentacao ?? null,
          dataUltimaVerificacao: row.dataUltimaVerificacao ?? null,
          tribunalSigla: row.tribunalSigla,
          comarca: row.comarca,
          vara: row.vara,
          classeProcessual: row.classeProcessual,
          assuntoPrincipal: row.assuntoPrincipal,
          area: row.area,
          statusPredito: row.statusPredito,
          tituloPoloAtivo: row.tituloPoloAtivo,
          tituloPoloPassivo: row.tituloPoloPassivo,
          valorCausa: row.valorCausa,
          quantidadeMovimentacoes: row.quantidadeMovimentacoes,
          segredoJustica: row.segredoJustica,
          processoPrincipalNumero: row.processoPrincipalNumero,
          linkProcesso: row.linkProcesso,
          payloadCompleto: row.payloadCompleto,
          updatedAt: row.updatedAt,
        },
      });

    processados += 1;
  }

  return {
    processados,
    advogadoLabel: `${adv.nome} (OAB ${adv.oab_uf} ${adv.oab_numero})`,
  };
}

/** POST: grava ou atualiza dados Escavador (upsert por numero_cnj + advogado OAB) */
export async function salvarDadosEscavador(
  req: RequestWithUser,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }
    const body = req.body as DadosEscavadorPayload;
    const adv = body?.advogado;
    const items = Array.isArray(body?.items) ? body.items : [];
    if (!adv?.nome || !adv?.oab_uf || !adv?.oab_numero) {
      res.status(400).json({
        error:
          "Payload deve ter advogado com nome, oab_uf e oab_numero",
      });
      return;
    }

    const { processados, advogadoLabel } = await gravarPayloadDadosEscavador(body);

    res.status(200).json({
      ok: true,
      total: items.length,
      processados,
      advogado: advogadoLabel,
    });
  } catch (err) {
    console.error("Salvar dados Escavador:", err);
    res.status(500).json({ error: "Erro ao gravar dados Escavador" });
  }
}

/** GET: lista dados Escavador (para tela futura "Integrar dados") */
export async function listarDadosEscavador(
  req: RequestWithUser,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }
    const oabUf = (req.query.oab_uf as string)?.trim();
    const oabNumero = (req.query.oab_numero as string)?.trim();
    const conditions = [];
    if (oabUf) conditions.push(eq(dadosEscavador.advogadoOabUf, oabUf));
    if (oabNumero)
      conditions.push(eq(dadosEscavador.advogadoOabNumero, oabNumero));

    const list = await db
      .select()
      .from(dadosEscavador)
      .where(
        conditions.length > 0 ? and(...conditions) : undefined
      )
      .orderBy(desc(dadosEscavador.dataUltimaMovimentacao), asc(dadosEscavador.numeroCnj));

    res.json(list);
  } catch (err) {
    console.error("Listar dados Escavador:", err);
    res.status(500).json({ error: "Erro ao listar dados Escavador" });
  }
}

/** Body: { oab_uf, oab_numero } para um advogado ou { advogados: [ { oab_uf, oab_numero } ] } para vários */
type SincronizarBody = {
  oab_uf?: string;
  oab_numero?: string;
  advogados?: Array<{ oab_uf?: string; oab_numero?: string }>;
};

/** POST: chama Escavador, normaliza e grava em dados_escavador (1 página por OAB). Não precisa do N8N. */
export async function sincronizarDadosEscavador(
  req: RequestWithUser,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }

    const tokenRaw = process.env.ESCAVADOR_API_KEY || process.env.ESCAVADOR_TOKEN;
    const token = typeof tokenRaw === "string" ? tokenRaw.trim() : "";
    if (!token) {
      res.status(503).json({
        error:
          "ESCAVADOR_API_KEY (ou ESCAVADOR_TOKEN) não configurada ou vazia. Defina no ambiente (EasyPanel: variáveis do serviço, não do build) e reinicie o container.",
      });
      return;
    }

    const body = req.body as SincronizarBody;
    let list: Array<{ oab_uf: string; oab_numero: string }>;

    if (body?.advogados && Array.isArray(body.advogados)) {
      list = body.advogados
        .filter(
          (a): a is { oab_uf: string; oab_numero: string } =>
            Boolean(a?.oab_uf?.trim() && a?.oab_numero?.trim())
        )
        .map((a) => ({ oab_uf: a.oab_uf.trim(), oab_numero: String(a.oab_numero).trim() }));
    } else if (body?.oab_uf?.trim() && body?.oab_numero?.trim()) {
      list = [{ oab_uf: body.oab_uf.trim(), oab_numero: String(body.oab_numero).trim() }];
    } else {
      res.status(400).json({
        error:
          'Envie { "oab_uf": "SP", "oab_numero": "270074" } ou { "advogados": [ { "oab_uf": "SP", "oab_numero": "270074" }, ... ] }',
      });
      return;
    }

    const resultados: Array<{
      oab_uf: string;
      oab_numero: string;
      processados: number;
      total_items: number;
      advogado: string;
      erro?: string;
    }> = [];

    for (const { oab_uf, oab_numero } of list) {
      try {
        const payload = await buscarTodasAsPaginasProcessosPorOab(oab_uf, oab_numero, token);
        const { processados, advogadoLabel } = await gravarPayloadDadosEscavador({
          advogado: payload.advogado,
          items: payload.items,
        });
        resultados.push({
          oab_uf,
          oab_numero,
          processados,
          total_items: payload.items.length,
          advogado: advogadoLabel,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        resultados.push({
          oab_uf,
          oab_numero,
          processados: 0,
          total_items: 0,
          advogado: `${oab_uf} ${oab_numero}`,
          erro: msg,
        });
      }
    }

    res.status(200).json({
      ok: true,
      resultados,
    });
  } catch (err) {
    console.error("Sincronizar Escavador:", err);
    res.status(500).json({ error: "Erro ao sincronizar com Escavador" });
  }
}
