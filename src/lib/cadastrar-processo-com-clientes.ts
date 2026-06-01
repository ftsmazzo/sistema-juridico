import { db } from "../db/index.js";
import { clientes, processos } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { formatarCnjParaGravar, normalizarNumeroCnj } from "./normalizar-cnj.js";
import { vincularPublicacoesOrfasAoProcesso, vincularPublicacaoAoProcesso } from "./vincular-publicacao-processo.js";
import type { ProcessoExtraidoIa } from "./extrair-processo-por-ia.js";
import { buscarClientesSugeridos, inferirTipoPessoa } from "./buscar-cliente.js";

export type ClienteFormInput =
  | { modo: "existente"; idCliente: number }
  | {
      modo: "novo";
      tipo: "PF" | "PJ";
      nome: string;
      razaoSocial?: string | null;
      cpf?: string | null;
      cnpj?: string | null;
      email?: string | null;
      telefone?: string | null;
      cidade?: string | null;
      estado?: string | null;
    };

export type ProcessoFormInput = {
  numeroCnj: string;
  status?: string;
  vara?: string | null;
  comarca?: string | null;
  instancia?: string | null;
  tipoAcao?: string | null;
  qualificacaoCliente?: string | null;
  outroEnvolvido?: string | null;
  qualificacaoOutro?: string | null;
  valorCausa?: string | null;
  observacoes?: string | null;
  idAdvogadoResponsavel?: number | null;
  cliente: ClienteFormInput;
  /** Vincula esta publicação ao processo após criar. */
  publicacaoId?: number;
};

export type PrepararProcessoResult = {
  processo: ProcessoExtraidoIa & { numeroCnj: string };
  cliente: {
    tipoSugerido: "PF" | "PJ";
    nome: string | null;
    razaoSocial: string | null;
    cpf: string | null;
    cnpj: string | null;
    qualificacaoCliente: string | null;
  };
  clientesSugeridos: Awaited<ReturnType<typeof buscarClientesSugeridos>>;
  processoExistenteId: number | null;
  camposObrigatoriosFaltando: string[];
  exigeConfirmacao: boolean;
};

function listarCamposFaltando(
  proc: ProcessoExtraidoIa,
  clienteNome?: string | null
): string[] {
  const faltando: string[] = [];
  if (!proc.numeroCnj?.trim()) faltando.push("numeroCnj");
  if (!clienteNome?.trim()) faltando.push("cliente.nome");
  return faltando;
}

async function buscarProcessoIdPorCnj(numeroCnj: string): Promise<number | null> {
  const cnjNorm = normalizarNumeroCnj(numeroCnj);
  if (!cnjNorm) return null;
  const [row] = await db
    .select({ id: processos.id })
    .from(processos)
    .where(sql`regexp_replace(${processos.numeroCnj}, '\\D', '', 'g') = ${cnjNorm}`)
    .limit(1);
  return row?.id ?? null;
}

export async function prepararCadastroProcesso(
  extraido: ProcessoExtraidoIa,
  opcoes?: { nomeClienteOverride?: string | null }
): Promise<PrepararProcessoResult> {
  const numeroCnj = extraido.numeroCnj?.trim()
    ? formatarCnjParaGravar(extraido.numeroCnj)
    : "";
  const nomeCliente =
    opcoes?.nomeClienteOverride?.trim() ||
    extraido.nomeCliente?.trim() ||
    null;
  const tipoSugerido =
    extraido.clienteTipo === "PJ" || extraido.clienteTipo === "PF"
      ? extraido.clienteTipo
      : inferirTipoPessoa(nomeCliente ?? "", extraido.clienteCnpj, extraido.clienteCpf);

  const clientesSugeridos = await buscarClientesSugeridos({
    nome: nomeCliente,
    cpf: extraido.clienteCpf,
    cnpj: extraido.clienteCnpj,
  });

  const camposObrigatoriosFaltando = listarCamposFaltando(
    { ...extraido, numeroCnj },
    nomeCliente
  );
  const processoExistenteId = numeroCnj
    ? await buscarProcessoIdPorCnj(numeroCnj)
    : null;

  const exigeConfirmacao =
    camposObrigatoriosFaltando.length > 0 ||
    clientesSugeridos.length === 0 ||
    !processoExistenteId;

  return {
    processo: { ...extraido, numeroCnj },
    cliente: {
      tipoSugerido,
      nome: nomeCliente,
      razaoSocial: extraido.clienteRazaoSocial ?? null,
      cpf: extraido.clienteCpf ?? null,
      cnpj: extraido.clienteCnpj ?? null,
      qualificacaoCliente: extraido.qualificacaoCliente ?? null,
    },
    clientesSugeridos,
    processoExistenteId,
    camposObrigatoriosFaltando,
    exigeConfirmacao: true,
  };
}

async function resolverIdCliente(cliente: ClienteFormInput): Promise<number> {
  if (cliente.modo === "existente") {
    const [c] = await db
      .select({ id: clientes.id })
      .from(clientes)
      .where(eq(clientes.id, cliente.idCliente))
      .limit(1);
    if (!c) throw new Error("Cliente selecionado não encontrado.");
    return c.id;
  }

  const nome = cliente.nome.trim();
  if (!nome) throw new Error("Nome do cliente é obrigatório.");

  const [inserted] = await db
    .insert(clientes)
    .values({
      tipo: cliente.tipo,
      nome: nome.slice(0, 255),
      razaoSocial: cliente.razaoSocial?.trim().slice(0, 255) || undefined,
      cpf: cliente.cpf?.trim().slice(0, 20) || undefined,
      cnpj: cliente.cnpj?.trim().slice(0, 20) || undefined,
      email: cliente.email?.trim().slice(0, 255) || undefined,
      telefone: cliente.telefone?.trim().slice(0, 50) || undefined,
      cidade: cliente.cidade?.trim().slice(0, 120) || undefined,
      estado: cliente.estado?.trim().slice(0, 5) || undefined,
      ativo: true,
    })
    .returning({ id: clientes.id });

  if (!inserted?.id) throw new Error("Falha ao cadastrar cliente.");
  return inserted.id;
}

export async function confirmarCadastroProcesso(
  input: ProcessoFormInput
): Promise<{
  processoId: number;
  clienteId: number;
  criado: boolean;
  clienteCriado: boolean;
  publicacoesVinculadas: number;
}> {
  const numeroGravar = formatarCnjParaGravar(input.numeroCnj);
  if (!numeroGravar) throw new Error("Número CNJ é obrigatório.");

  const idCliente = await resolverIdCliente(input.cliente);
  const clienteCriado = input.cliente.modo === "novo";

  const [cli] = await db
    .select({ nome: clientes.nome, tipo: clientes.tipo })
    .from(clientes)
    .where(eq(clientes.id, idCliente))
    .limit(1);

  const nomeCliente = cli?.nome ?? "";
  const titulo =
    nomeCliente && input.outroEnvolvido
      ? `${nomeCliente} x ${input.outroEnvolvido}`.slice(0, 400)
      : nomeCliente.slice(0, 400) || undefined;

  const existenteId = await buscarProcessoIdPorCnj(numeroGravar);
  let processoId: number;
  let criado = false;

  if (existenteId) {
    processoId = existenteId;
    await db
      .update(processos)
      .set({
        idCliente,
        tipoCliente: cli?.tipo ?? undefined,
        nomeCliente: nomeCliente.slice(0, 255),
        vara: input.vara?.slice(0, 120) ?? undefined,
        comarca: input.comarca?.slice(0, 120) ?? undefined,
        instancia: input.instancia?.slice(0, 80) ?? undefined,
        tipoAcao: input.tipoAcao?.slice(0, 120) ?? undefined,
        qualificacaoCliente: input.qualificacaoCliente?.slice(0, 60) ?? undefined,
        outroEnvolvido: input.outroEnvolvido?.slice(0, 255) ?? undefined,
        qualificacaoOutro: input.qualificacaoOutro?.slice(0, 60) ?? undefined,
        valorCausa: input.valorCausa?.slice(0, 50) ?? undefined,
        observacoes: input.observacoes ?? undefined,
        titulo,
      })
      .where(eq(processos.id, processoId));
  } else {
    const [inserted] = await db
      .insert(processos)
      .values({
        numeroCnj: numeroGravar,
        status: (input.status ?? "Ativo").slice(0, 30),
        idCliente,
        tipoCliente: cli?.tipo ?? undefined,
        nomeCliente: nomeCliente.slice(0, 255),
        vara: input.vara?.slice(0, 120) ?? undefined,
        comarca: input.comarca?.slice(0, 120) ?? undefined,
        instancia: input.instancia?.slice(0, 80) ?? undefined,
        tipoAcao: input.tipoAcao?.slice(0, 120) ?? undefined,
        qualificacaoCliente: input.qualificacaoCliente?.slice(0, 60) ?? undefined,
        outroEnvolvido: input.outroEnvolvido?.slice(0, 255) ?? undefined,
        qualificacaoOutro: input.qualificacaoOutro?.slice(0, 60) ?? undefined,
        valorCausa: input.valorCausa?.slice(0, 50) ?? undefined,
        observacoes: input.observacoes ?? undefined,
        idAdvogadoResponsavel: input.idAdvogadoResponsavel ?? undefined,
        titulo,
      })
      .returning({ id: processos.id });
    if (!inserted?.id) throw new Error("Falha ao criar processo.");
    processoId = inserted.id;
    criado = true;
  }

  let publicacoesVinculadas = await vincularPublicacoesOrfasAoProcesso(
    processoId,
    numeroGravar
  );
  if (input.publicacaoId) {
    await vincularPublicacaoAoProcesso(input.publicacaoId, processoId);
    publicacoesVinculadas = Math.max(publicacoesVinculadas, 1);
  }

  return {
    processoId,
    clienteId: idCliente,
    criado,
    clienteCriado,
    publicacoesVinculadas,
  };
}
