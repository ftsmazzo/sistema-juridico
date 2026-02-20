/**
 * Tipos para o payload do webhook Publicações OAB (Recorte Digital).
 * O workflow envia um array desses itens.
 */
export type AdvogadoPublicacao = {
  nome: string;
  oab: string;
};

export type ItemPublicacaoOab = {
  emailId: string;
  subject?: string;
  date?: string;
  from?: string;
  to?: string;
  isRecorteDigital: boolean;
  // Campos quando isRecorteDigital === true
  advogado?: string;
  numeroOab?: string;
  dataProcessamento?: string;
  totalPublicacoes?: number;
  publicacaoNumero?: number;
  dataDisponibilizacao?: string;
  dataPublicacao?: string;
  jornal?: string;
  pagina?: string;
  caderno?: string;
  local?: string;
  vara?: string;
  tipoPublicacao?: string;
  numeroProcesso?: string;
  valorMencionado?: string;
  textoCompleto?: string;
  advogados?: AdvogadoPublicacao[];
  poloAtivo?: string;
  polosPassivos?: string[];
  urlDocumento?: string;
  identificadorDocumento?: string;
  // Quando isRecorteDigital === false
  publicacoes?: unknown[];
  mensagem?: string;
};
