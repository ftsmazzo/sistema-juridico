/**
 * Extrai dados básicos de processo a partir de imagem (print, capa, petição inicial, PDF renderizado).
 */
import {
  extrairJsonDeImagemComPrompt,
  type OpcoesExtracao,
  type ProvedorIa,
} from "./extrair-publicacao-por-ia.js";
import { formatarCnjParaGravar } from "./normalizar-cnj.js";

const PROMPT_PROCESSO = `Você é um assistente jurídico. Analise a IMAGEM (print, foto ou página de PDF) de documento processual: capa do processo, petição inicial, certidão, publicação do DJE ou tela do tribunal.

Extraia os dados para cadastro no escritório. Retorne APENAS um JSON válido (sem markdown), com estas chaves:

{
  "numeroCnj": "número CNJ completo (ex.: 1032539-59.2024.8.26.0196)",
  "vara": "vara ou juízo",
  "comarca": "comarca ou foro",
  "instancia": "1º grau, 2º grau, etc.",
  "tipoAcao": "tipo da ação (ex.: Procedimento Comum, Cumprimento de Sentença)",
  "nomeCliente": "nome da parte que representamos ou polo do cliente do escritório",
  "qualificacaoCliente": "autor, réu, exequente, etc.",
  "outroEnvolvido": "parte contrária principal",
  "qualificacaoOutro": "qualificação da parte contrária",
  "valorCausa": "valor se aparecer",
  "status": "Ativo",
  "observacoes": "notas úteis em uma frase"
}

Use null para campos não encontrados. numeroCnj é obrigatório se estiver visível na imagem.`;

export type ProcessoExtraidoIa = {
  numeroCnj?: string | null;
  vara?: string | null;
  comarca?: string | null;
  instancia?: string | null;
  tipoAcao?: string | null;
  nomeCliente?: string | null;
  qualificacaoCliente?: string | null;
  outroEnvolvido?: string | null;
  qualificacaoOutro?: string | null;
  valorCausa?: string | null;
  status?: string | null;
  observacoes?: string | null;
};

export async function extrairProcessoDeImagem(
  imageBase64: string,
  opcoes?: OpcoesExtracao
): Promise<ProcessoExtraidoIa> {
  const prompt = process.env.PROCESSOS_DOCUMENTO_PROMPT ?? PROMPT_PROCESSO;
  return extrairJsonDeImagemComPrompt<ProcessoExtraidoIa>(
    imageBase64,
    prompt,
    opcoes,
    (parsed) => {
      const obj = (Array.isArray(parsed) ? parsed[0] : parsed) as ProcessoExtraidoIa;
      if (obj.numeroCnj) {
        obj.numeroCnj = formatarCnjParaGravar(String(obj.numeroCnj));
      }
      return obj;
    }
  );
}

export type { ProvedorIa, OpcoesExtracao };
