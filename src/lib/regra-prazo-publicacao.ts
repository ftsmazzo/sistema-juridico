/**
 * Regra do escritório para prazos a partir de publicações OAB:
 * - Sem prazo específico na publicação/IA (0 ou ausente): 5 dias úteis (fatal).
 * - Margem de segurança: 2 dias úteis → data exibida no sistema = fatal − 2 (ex.: 3 du).
 * - Intimação CPC com prazo explícito na IA (> 0): usa o valor da IA (ex.: 15 → exibe 13).
 * - Só extrator regex (sem IA) e tipo intimação: 15 dias CPC antes da margem.
 */

/** Prazo fatal quando a publicação não indica prazo específico (regra interna). */
export const DIAS_UTEIS_PRAZO_FATAL_PADRAO = 5;

/** Margem de segurança: o calendário antecipa este número de dias úteis. */
export const DIAS_UTEIS_MARGEM_SEGURANCA = 2;

/** Intimação identificada só pelo extrator (sem análise IA). */
export const DIAS_UTEIS_INTIMACAO_CPC_SEM_IA = 15;

export type DiasPrazoResolvido = {
  /** Prazo fatal de referência (regra ou IA). */
  diasFatal: number;
  /** Dias úteis usados para calcular a data no calendário (fatal − margem). */
  diasNoSistema: number;
  /** True quando aplicamos 5 dias por falta de prazo específico na IA. */
  usouPrazoPadraoEscritorio: boolean;
};

export function ehTipoIntimacao(tipo: string | null | undefined): boolean {
  const t = (tipo ?? "").toLowerCase();
  return t.includes("intimação") || t.includes("intimacao");
}

/**
 * Resolve dias úteis para gravar prazo no sistema.
 * @param prazoDiasUteisSugerido Valor da IA: > 0 = prazo legal específico; 0 ou ausente = sem prazo específico.
 */
export function resolverDiasPrazoPublicacao(
  prazoDiasUteisSugerido: number | null | undefined,
  opcoes?: { semAnaliseIa?: boolean; tipoPublicacao?: string | null }
): DiasPrazoResolvido {
  const temEspecificoIA =
    typeof prazoDiasUteisSugerido === "number" && prazoDiasUteisSugerido > 0;

  let diasFatal: number;
  let usouPrazoPadraoEscritorio = false;

  if (temEspecificoIA) {
    diasFatal = prazoDiasUteisSugerido;
  } else if (
    opcoes?.semAnaliseIa &&
    opcoes.tipoPublicacao &&
    ehTipoIntimacao(opcoes.tipoPublicacao)
  ) {
    diasFatal = DIAS_UTEIS_INTIMACAO_CPC_SEM_IA;
  } else {
    diasFatal = DIAS_UTEIS_PRAZO_FATAL_PADRAO;
    usouPrazoPadraoEscritorio = true;
  }

  const diasNoSistema = Math.max(1, diasFatal - DIAS_UTEIS_MARGEM_SEGURANCA);
  return { diasFatal, diasNoSistema, usouPrazoPadraoEscritorio };
}
