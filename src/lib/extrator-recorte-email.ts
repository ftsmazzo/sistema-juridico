/**
 * Extrator Recorte Digital OAB/SP a partir do corpo do e-mail.
 * Port do docs/n8n-extrator-recorte-oab.js para uso no backend (sem N8N).
 * Entrada: texto/html do e-mail. Saída: ItemPublicacaoOab[] (apenas itens isRecorteDigital true).
 */
import type { ItemPublicacaoOab } from "./publicacoes-oab.types.js";

function normalizeText(htmlOrText: string): string {
  return htmlOrText
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*:\s*/g, ": ")
    .trim();
}

function isRecorteDigital(raw: string, subject: string): boolean {
  const s = (subject || "").toLowerCase();
  return (
    /recorte digital|oab\/sp/.test(s) ||
    /Recorte Digital - OAB - Resultado da Busca|Data processamento\/pesquisa/.test(raw)
  );
}

function pick(regex: RegExp, str: string, def = ""): string {
  const m = (str || "").match(regex);
  return m ? (m[1] !== undefined ? m[1].trim() : m[0].trim()) : def;
}

function norm(s: string | undefined): string {
  return (s || "").replace(/\s+/g, " ").trim();
}

export type EmailPayload = {
  /** Corpo do e-mail em texto plano ou HTML (será normalizado) */
  emailText?: string;
  emailHtml?: string;
  subject?: string;
  from?: string;
  to?: string;
  /** ID do e-mail (ex.: Gmail message id); se não informado, gera um */
  emailId?: string;
};

/**
 * Extrai publicações Recorte Digital do corpo do e-mail.
 * Retorna array de ItemPublicacaoOab (um por publicação); vazio se não for Recorte.
 */
export function extrairPublicacoesDeEmail(payload: EmailPayload): ItemPublicacaoOab[] {
  const raw = normalizeText(
    payload.emailText || payload.emailHtml || ""
  );
  if (!raw) return [];

  const subject = payload.subject || "";
  if (!isRecorteDigital(raw, subject)) return [];

  const emailId = payload.emailId || `email-${Date.now()}`;
  const from = payload.from || "";
  const to = payload.to || "";

  const advogado = norm(
    pick(
      /Advogado\(a\)\s*[\s\S]*?([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?=\s*Número da OAB|$)/i,
      raw
    )
  );
  const numeroOab = pick(/Número da OAB\s*[\s\S]*?(\d{5,6}\s*-\s*[A-Z]{2})/i, raw);
  const dataProcessamento = pick(
    /Data processamento\/pesquisa\s*[\s\S]*?(\d{2}\/\d{2}\/\d{4}\s*\([A-Z]{2}\))/i,
    raw
  );

  const rePub = /Publicação:\s*(\d+)\s*\./gi;
  const blocos: { num: number; start: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = rePub.exec(raw)) !== null) {
    blocos.push({ num: parseInt(m[1], 10), start: m.index });
  }

  if (blocos.length === 0) {
    if (/Data de Disponibilização/.test(raw) && /PROCESSO:\s*\d{7}/.test(raw)) {
      blocos.push({ num: 1, start: 0 });
    } else {
      return [];
    }
  }

  const saida: ItemPublicacaoOab[] = [];

  for (let i = 0; i < blocos.length; i++) {
    const start = blocos[i].start;
    const end = blocos[i + 1] ? blocos[i + 1].start : raw.length;
    let t = raw.slice(start, end).trim();
    const totalIdx = t.search(/Total de Publicações:\s*\d+/i);
    if (totalIdx >= 0) t = t.slice(0, totalIdx).trim();

    const dataDisp = pick(/Data de Disponibilização:\s*(\d{2}\/\d{2}\/\d{4})/i, t);
    const dataPub = pick(/Data de Publicação:\s*(\d{2}\/\d{2}\/\d{4})/i, t);
    const jornal = norm(pick(/Jornal:\s*([^\n]+?)(?=\s*Página:|$)/i, t));
    const pagina = pick(/Página:\s*(\d+)/i, t);
    const caderno = norm(pick(/Caderno:\s*([^\n]+?)(?=\s*Local:|$)/i, t));
    const local = norm(pick(/Local:\s*([^\n]+?)(?=\s*Vara:|$)/i, t));
    const vara = norm(
      pick(/Vara:\s*([\s\S]+?)(?=\s*Publicação:\s*Intimação|\s*PROCESSO:|$)/i, t)
    );
    const tipoPub =
      norm(
        pick(
          /(?:Publicação:\s*)(Intimação|Despacho|Decisão|Sentença|Acórdão|Outros?|[\wçãõ\s]+?)(?=\s*PROCESSO:|\s*$)/i,
          t
        )
      ) || "Intimação";
    const numeroProcesso = pick(
      /PROCESSO:\s*(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/i,
      t
    );
    const valorMencionado = pick(/R\$\s*[\d.,]+/, t);
    const urlDocumento = (pick(/Acesso ao documento:\s*(https?\s*:\s*\/\/[^\s]+)/i, t) || "").replace(
      /\s/g,
      ""
    );
    const identificadorDocumento = pick(/Identificador do documento:\s*(\d+)/i, t);

    const idxProc = t.search(/PROCESSO:\s*\d{7}/i);
    const textoCompleto = idxProc >= 0 ? norm(t.slice(idxProc)) : norm(t);

    const advogados: { nome: string; oab: string }[] = [];
    const reAdv = /([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑa-z\s]+?)\s*\(\s*OAB\s*(\d+\/[A-Z]{2})\s*\)/g;
    let advM: RegExpExecArray | null;
    while ((advM = reAdv.exec(t)) !== null) {
      advogados.push({ nome: norm(advM[1]), oab: advM[2].trim() });
    }

    const poloAtivo = norm(
      pick(/POLO ATIVO:\s*([^|]+?)(?=\s*POLO PASSIVO:|\s*ADVOGADO:|$)/i, t)
    );
    const polosPassivos: string[] = [];
    const rePassivo = /POLO PASSIVO:\s*([^|]+?)(?=\s*POLO PASSIVO:|\s*ADVOGADO:|\s*Acesso|$)/gi;
    let passM: RegExpExecArray | null;
    while ((passM = rePassivo.exec(t)) !== null) {
      polosPassivos.push(norm(passM[1]));
    }

    saida.push({
      emailId,
      subject,
      from,
      to,
      isRecorteDigital: true,
      advogado,
      numeroOab,
      dataProcessamento,
      totalPublicacoes: blocos.length,
      publicacaoNumero: blocos[i].num,
      dataDisponibilizacao: dataDisp || undefined,
      dataPublicacao: dataPub || undefined,
      jornal: jornal || undefined,
      pagina: pagina || undefined,
      caderno: caderno || undefined,
      local: local || undefined,
      vara: vara || undefined,
      tipoPublicacao: tipoPub,
      numeroProcesso: numeroProcesso || undefined,
      valorMencionado: valorMencionado || undefined,
      textoCompleto: textoCompleto || undefined,
      advogados: advogados.length ? advogados : undefined,
      poloAtivo: poloAtivo || undefined,
      polosPassivos: polosPassivos.length ? polosPassivos : undefined,
      urlDocumento: urlDocumento || undefined,
      identificadorDocumento: identificadorDocumento || undefined,
    });
  }

  return saida;
}
