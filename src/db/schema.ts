import {
  pgTable,
  serial,
  varchar,
  text,
  date,
  timestamp,
  boolean,
  integer,
  uniqueIndex,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// --- Pessoas (cadastro único: advogados e não advogados; futuro: clientes) ---
export const pessoas = pgTable("pessoas", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  sobrenome: varchar("sobrenome", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  celular: varchar("celular", { length: 50 }),
  tipo: varchar("tipo", { length: 20 }).notNull().default("colaborador"), // advogado | colaborador | cliente
  numeroOab: varchar("numero_oab", { length: 50 }),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Usuários (acesso ao sistema: login + perfil; vinculado a uma Pessoa) ---
// Colunas nome, sobrenome, email, celular, numeroOab, grupo: legado até migração para pessoas
export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  idPessoa: integer("id_pessoa").references(() => pessoas.id, { onDelete: "set null" }),
  nome: varchar("nome", { length: 255 }).notNull(),
  sobrenome: varchar("sobrenome", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  celular: varchar("celular", { length: 255 }),
  login: varchar("login", { length: 255 }).notNull().unique(),
  senha: varchar("senha", { length: 255 }).notNull(),
  ativo: boolean("ativo").notNull().default(true),
  relatorio: varchar("relatorio", { length: 255 }).notNull().default("0"),
  grupo: varchar("grupo", { length: 255 }).notNull().default("usuario"),
  perfil: varchar("perfil", { length: 30 }), // consultivo | administrativo | advogado | gestor (sobrepõe grupo quando preenchido)
  numeroOab: varchar("numero_oab", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  /** Token para link de inscrição do calendário (.ics); único por usuário. */
  calendarFeedToken: varchar("calendar_feed_token", { length: 64 }),
});

// --- Prazos ---
// status: 0 = não cumprido; ou id do usuario que cumpriu
export const prazos = pgTable("prazos", {
  id: serial("id").primaryKey(),
  tipo: varchar("tipo", { length: 50 }).notNull(), // administrativo | civil | trabalhista
  data: date("data").notNull(),
  observacao: text("observacao").default(""),
  conteudo: text("conteudo").notNull().default(""),
  prazo: varchar("prazo", { length: 255 }).notNull(),
  status: integer("status").notNull().default(0),
  dataCumprido: date("data_cumprido"),
  dataHoraCumprido: timestamp("datahoracumprido"),
  publicacaoOabId: integer("publicacao_oab_id").references(
    () => publicacoesOab.id,
    { onDelete: "set null" }
  ),
  movimentacaoId: integer("movimentacao_id").references(
    () => movimentacoes.id,
    { onDelete: "set null" }
  ),
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "set null" }),
  numeroProcesso: varchar("numero_processo", { length: 100 }),
  /** Link da peça/documento que deu cumprimento ao prazo (ex.: OneDrive, SharePoint). */
  linkPeca: varchar("link_peca", { length: 1000 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const prazosUsuarios = pgTable(
  "prazos_usuarios",
  {
    id: serial("id").primaryKey(),
    idPrazo: integer("id_prazo")
      .notNull()
      .references(() => prazos.id, { onDelete: "cascade" }),
    idUsuario: integer("id_usuario")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
  }
);

// --- Subtarefas do prazo (checklist para execução) ---
export const prazoSubtarefas = pgTable("prazo_subtarefas", {
  id: serial("id").primaryKey(),
  idPrazo: integer("id_prazo")
    .notNull()
    .references(() => prazos.id, { onDelete: "cascade" }),
  titulo: varchar("titulo", { length: 500 }).notNull(),
  concluida: boolean("concluida").notNull().default(false),
  ordem: integer("ordem").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Labels globais para tarefas internas (único por nome canônico no banco via índice SQL). */
export const tarefaLabel = pgTable("tarefa_label", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 120 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Tarefas operacionais do escritório, sempre ligadas a um prazo. */
export const tarefaInterna = pgTable("tarefa_interna", {
  id: serial("id").primaryKey(),
  prazoId: integer("prazo_id")
    .notNull()
    .references(() => prazos.id, { onDelete: "cascade" }),
  titulo: varchar("titulo", { length: 500 }).notNull(),
  descricao: text("descricao"),
  tipo: varchar("tipo", { length: 40 }).notNull(),
  dataLimite: date("data_limite").notNull(),
  idCriador: integer("id_criador")
    .notNull()
    .references(() => usuarios.id, { onDelete: "restrict" }),
  idResponsavel: integer("id_responsavel")
    .notNull()
    .references(() => usuarios.id, { onDelete: "restrict" }),
  status: varchar("status", { length: 20 }).notNull().default("pendente"),
  cumpridaEm: timestamp("cumprida_em"),
  cumpridoPor: integer("cumprido_por").references(() => usuarios.id, { onDelete: "set null" }),
  d3EnviadoEm: timestamp("d3_enviado_em"),
  cobrancaUltimaEm: timestamp("cobranca_ultima_em"),
  criacaoNotificadaEm: timestamp("criacao_notificada_em"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tarefaInternaLabel = pgTable(
  "tarefa_interna_label",
  {
    tarefaInternaId: integer("tarefa_interna_id")
      .notNull()
      .references(() => tarefaInterna.id, { onDelete: "cascade" }),
    tarefaLabelId: integer("tarefa_label_id")
      .notNull()
      .references(() => tarefaLabel.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.tarefaInternaId, t.tarefaLabelId] }),
  })
);

// --- Audiências ---
export const audiencias = pgTable("audiencias", {
  id: serial("id").primaryKey(),
  numProcesso: varchar("num_processo", { length: 150 }).notNull(),
  vara: varchar("vara", { length: 150 }).notNull(),
  local: varchar("local", { length: 150 }).notNull(),
  reclamante: varchar("reclamante", { length: 150 }),
  reclamado: varchar("reclamado", { length: 150 }),
  preposto: varchar("preposto", { length: 150 }),
  dataHora: timestamp("datahora").notNull(),
  observacao: text("observacao"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const audienciasUsuarios = pgTable("audiencias_usuarios", {
  id: serial("id").primaryKey(),
  idAudiencia: integer("id_audiencia")
    .notNull()
    .references(() => audiencias.id, { onDelete: "cascade" }),
  idUsuario: integer("id_usuario")
    .notNull()
    .references(() => usuarios.id, { onDelete: "cascade" }),
});

// --- Agenda (contatos) ---
export const agenda = pgTable("agenda", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 150 }).notNull().default(""),
  telefone: varchar("telefone", { length: 150 }).notNull().default(""),
  celular: varchar("celular", { length: 150 }),
  email: varchar("email", { length: 150 }),
  endereco: varchar("endereco", { length: 150 }),
  nascimento: date("nascimento"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Clientes (PF + PJ; espelha Clie-F e Clie-J da planilha) ---
export const clientes = pgTable("clientes", {
  id: serial("id").primaryKey(),
  tipo: varchar("tipo", { length: 10 }).notNull(), // PF | PJ
  // PF: nome completo; PJ: nome fantasia (exibição)
  nome: varchar("nome", { length: 255 }).notNull(),
  razaoSocial: varchar("razao_social", { length: 255 }),
  cpf: varchar("cpf", { length: 20 }),
  cnpj: varchar("cnpj", { length: 20 }),
  sexo: varchar("sexo", { length: 5 }),
  dataNascimento: date("data_nascimento"),
  telefone: varchar("telefone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  endereco: varchar("endereco", { length: 255 }),
  bairro: varchar("bairro", { length: 120 }),
  cep: varchar("cep", { length: 20 }),
  cidade: varchar("cidade", { length: 120 }),
  estado: varchar("estado", { length: 5 }),
  profissao: varchar("profissao", { length: 120 }),
  estadoCivil: varchar("estado_civil", { length: 50 }),
  segmentoAtuacao: varchar("segmento_atuacao", { length: 120 }),
  responsavelLegal: varchar("responsavel_legal", { length: 255 }),
  comoConheceu: varchar("como_conheceu", { length: 120 }),
  observacoes: text("observacoes"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Processos (espelha Proc-G; relaciona cliente + advogado responsável) ---
export const processos = pgTable(
  "processos",
  {
    id: serial("id").primaryKey(),
    numeroCnj: varchar("numero_cnj", { length: 50 }).notNull().unique(),
    status: varchar("status", { length: 30 }).notNull().default("Ativo"),
    tipo: varchar("tipo", { length: 30 }),
    fase: varchar("fase", { length: 80 }),
    tipoAcao: varchar("tipo_acao", { length: 120 }),
    tipoCliente: varchar("tipo_cliente", { length: 20 }),
    idCliente: integer("id_cliente").references(() => clientes.id, { onDelete: "set null" }),
    nomeCliente: varchar("nome_cliente", { length: 255 }),
    qualificacaoCliente: varchar("qualificacao_cliente", { length: 60 }),
    outroEnvolvido: varchar("outro_envolvido", { length: 255 }),
    qualificacaoOutro: varchar("qualificacao_outro", { length: 60 }),
    idAdvogadoResponsavel: integer("id_advogado_responsavel").references(() => usuarios.id, {
      onDelete: "set null",
    }),
    nomeAdvogado: varchar("nome_advogado", { length: 255 }),
    valorCausa: varchar("valor_causa", { length: 50 }),
    valorAcordoSentenca: varchar("valor_acordo_sentenca", { length: 50 }),
    valorHonorariosReais: varchar("valor_honorarios_reais", { length: 50 }),
    valorHonorariosPercentual: varchar("valor_honorarios_percentual", { length: 30 }),
    sucumbencias: varchar("sucumbencias", { length: 100 }),
    totalHonorarios: varchar("total_honorarios", { length: 100 }),
    prazoEmAberto: boolean("prazo_em_aberto"),
    dataPrazo: date("data_prazo"),
    instancia: varchar("instancia", { length: 80 }),
    comarca: varchar("comarca", { length: 120 }),
    vara: varchar("vara", { length: 120 }),
    observacoes: text("observacoes"),
    dataInicio: date("data_inicio"),
    dataUltimaMovimentacao: date("data_ultima_movimentacao"),
    dataFim: date("data_fim"),
    duracaoTexto: varchar("duracao_texto", { length: 50 }),
    resultado: varchar("resultado", { length: 80 }),
    linkProcesso: varchar("link_processo", { length: 500 }),
    linkPastaDocumentos: varchar("link_pasta_documentos", { length: 500 }),
    titulo: varchar("titulo", { length: 400 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("processos_numero_cnj_idx").on(t.numeroCnj)]
);

// --- Movimentações do processo (espelha Proc-M: histórico por processo) ---
export const movimentacoesProcesso = pgTable("movimentacoes_processo", {
  id: serial("id").primaryKey(),
  idProcesso: integer("id_processo")
    .notNull()
    .references(() => processos.id, { onDelete: "cascade" }),
  ordem: integer("ordem").notNull().default(1),
  movimentacao: text("movimentacao"),
  dataMovimentacao: date("data_movimentacao"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Dados Escavador (cache por OAB: não pagar de novo; base para "Integrar dados") ---
export const dadosEscavador = pgTable(
  "dados_escavador",
  {
    id: serial("id").primaryKey(),
    numeroCnj: varchar("numero_cnj", { length: 50 }).notNull(),
    advogadoNome: varchar("advogado_nome", { length: 255 }),
    advogadoOabUf: varchar("advogado_oab_uf", { length: 5 }),
    advogadoOabNumero: varchar("advogado_oab_numero", { length: 20 }),
    dataInicio: date("data_inicio"),
    dataUltimaMovimentacao: date("data_ultima_movimentacao"),
    dataUltimaVerificacao: timestamp("data_ultima_verificacao"),
    tribunalSigla: varchar("tribunal_sigla", { length: 20 }),
    comarca: varchar("comarca", { length: 120 }),
    vara: varchar("vara", { length: 255 }),
    classeProcessual: varchar("classe_processual", { length: 200 }),
    assuntoPrincipal: varchar("assunto_principal", { length: 500 }),
    area: varchar("area", { length: 80 }),
    statusPredito: varchar("status_predito", { length: 30 }),
    tituloPoloAtivo: varchar("titulo_polo_ativo", { length: 500 }),
    tituloPoloPassivo: varchar("titulo_polo_passivo", { length: 500 }),
    valorCausa: varchar("valor_causa", { length: 50 }),
    quantidadeMovimentacoes: integer("quantidade_movimentacoes"),
    segredoJustica: boolean("segredo_justica"),
    processoPrincipalNumero: varchar("processo_principal_numero", { length: 50 }),
    linkProcesso: varchar("link_processo", { length: 500 }),
    payloadCompleto: jsonb("payload_completo"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("dados_escavador_numero_advogado_idx").on(
      t.numeroCnj,
      t.advogadoOabUf,
      t.advogadoOabNumero
    ),
  ]
);

// --- Conta de e-mail para monitoramento (IMAP: Yahoo, OAB, etc.) ---
// Uma conta por sistema; verificação automática a cada interval_minutes; extração cria só publicações; análise IA fica no N8N (botão).
// idUsuario/numeroOab: vinculam a conta a um usuário para buscar telefone na notificação WhatsApp.
export const contaEmailMonitoramento = pgTable("conta_email_monitoramento", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull().default("Conta principal"),
  host: varchar("host", { length: 255 }).notNull(),
  port: integer("port").notNull().default(993),
  secure: boolean("secure").notNull().default(true),
  user: varchar("user", { length: 255 }).notNull(),
  passwordEncrypted: text("password_encrypted"),
  remetentesFiltro: jsonb("remetentes_filtro").$type<string[]>().default([]),
  intervalMinutes: integer("interval_minutes").notNull().default(15),
  lastCheckedAt: timestamp("last_checked_at"),
  lastError: text("last_error"),
  ativo: boolean("ativo").notNull().default(true),
  /** Usuário vinculado: usado para buscar celular na notificação (prioridade sobre numeroOab da conta). */
  idUsuario: integer("id_usuario").references(() => usuarios.id, { onDelete: "set null" }),
  /** OAB do advogado da conta: alternativa para buscar celular quando idUsuario não estiver preenchido. */
  numeroOab: varchar("numero_oab", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Publicações OAB (Recorte Digital) ---
export const publicacoesOab = pgTable(
  "publicacoes_oab",
  {
    id: serial("id").primaryKey(),
    emailId: varchar("email_id", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 500 }),
    dateEmail: timestamp("date_email"),
    fromEmail: varchar("from_email", { length: 255 }),
    toEmail: varchar("to_email", { length: 255 }),
    advogadoPrincipal: varchar("advogado_principal", { length: 255 }),
    numeroOab: varchar("numero_oab", { length: 50 }),
    dataProcessamento: varchar("data_processamento", { length: 100 }),
    totalPublicacoes: integer("total_publicacoes"),
    publicacaoNumero: integer("publicacao_numero").notNull(),
    dataDisponibilizacao: varchar("data_disponibilizacao", { length: 50 }),
    dataPublicacao: varchar("data_publicacao", { length: 50 }),
    jornal: varchar("jornal", { length: 255 }),
    pagina: varchar("pagina", { length: 50 }),
    caderno: varchar("caderno", { length: 100 }),
    local: varchar("local", { length: 500 }),
    vara: varchar("vara", { length: 500 }),
    tipoPublicacao: varchar("tipo_publicacao", { length: 100 }),
    numeroProcesso: varchar("numero_processo", { length: 100 }),
    valorMencionado: varchar("valor_mencionado", { length: 100 }),
    textoCompleto: text("texto_completo"),
    advogados: jsonb("advogados").$type<{ nome: string; oab: string }[]>(),
    poloAtivo: varchar("polo_ativo", { length: 500 }),
    polosPassivos: jsonb("polos_passivos").$type<string[]>(),
    urlDocumento: varchar("url_documento", { length: 500 }),
    identificadorDocumento: varchar("identificador_documento", { length: 100 }),
    resumo: text("resumo"),
    baseLegal: varchar("base_legal", { length: 255 }),
    prazoDiasUteisSugerido: integer("prazo_dias_uteis_sugerido"),
    observacoesIa: text("observacoes_ia"),
    movimentacoes: jsonb("movimentacoes").$type<{ tipo: string; resumo: string }[]>(),
    fontesEmail: jsonb("fontes_email").$type<{ emailId?: string; from?: string; to?: string }[]>().default([]),
    processoId: integer("processo_id").references(() => processos.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("publicacoes_oab_email_num").on(t.emailId, t.publicacaoNumero),
    uniqueIndex("publicacoes_oab_processo_doc").on(
      t.numeroProcesso,
      t.identificadorDocumento
    ),
  ]
);

// --- Movimentações (extraídas da publicação pela IA; uma publicação pode ter N) ---
export const movimentacoes = pgTable("movimentacoes", {
  id: serial("id").primaryKey(),
  publicacaoOabId: integer("publicacao_oab_id")
    .notNull()
    .references(() => publicacoesOab.id, { onDelete: "cascade" }),
  tipo: varchar("tipo", { length: 100 }).notNull(), // Decisão, Intimação, etc.
  resumo: text("resumo"),
  ordem: integer("ordem").notNull().default(1),
  prazoDiasUteis: integer("prazo_dias_uteis"), // sugerido pela IA
  dataLimite: date("data_limite"), // calculada a partir da data da publicação
  baseLegal: varchar("base_legal", { length: 255 }),
  fonte: varchar("fonte", { length: 20 }).notNull().default("ia"), // 'email' | 'ia' | 'escavador'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Análise IA da publicação (1:1; preserva resumo, observações e resposta completa) ---
export const analiseIaPublicacao = pgTable("analise_ia_publicacao", {
  id: serial("id").primaryKey(),
  publicacaoOabId: integer("publicacao_oab_id")
    .notNull()
    .unique()
    .references(() => publicacoesOab.id, { onDelete: "cascade" }),
  resumo: text("resumo"),
  observacoesIa: text("observacoes_ia"),
  baseLegalGeral: varchar("base_legal_geral", { length: 255 }),
  respostaCompleta: jsonb("resposta_completa").$type<{
    resumo?: string;
    baseLegal?: string;
    prazoDiasUteisSugerido?: number;
    observacoesIa?: string;
    movimentacoes?: { tipo: string; resumo: string }[];
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relações
export const pessoasRelations = relations(pessoas, ({ many }) => ({
  usuarios: many(usuarios),
}));

export const usuariosRelations = relations(usuarios, ({ one, many }) => ({
  pessoa: one(pessoas, {
    fields: [usuarios.idPessoa],
    references: [pessoas.id],
  }),
  prazosUsuarios: many(prazosUsuarios),
  audienciasUsuarios: many(audienciasUsuarios),
  processosResponsavel: many(processos),
}));

export const clientesRelations = relations(clientes, ({ many }) => ({
  processos: many(processos),
}));

export const processosRelations = relations(processos, ({ one, many }) => ({
  cliente: one(clientes, {
    fields: [processos.idCliente],
    references: [clientes.id],
  }),
  advogadoResponsavel: one(usuarios, {
    fields: [processos.idAdvogadoResponsavel],
    references: [usuarios.id],
  }),
  movimentacoesProcesso: many(movimentacoesProcesso),
  prazos: many(prazos),
  publicacoesOab: many(publicacoesOab),
}));

export const movimentacoesProcessoRelations = relations(movimentacoesProcesso, ({ one }) => ({
  processo: one(processos, {
    fields: [movimentacoesProcesso.idProcesso],
    references: [processos.id],
  }),
}));

export const prazosRelations = relations(prazos, ({ one, many }) => ({
  publicacaoOab: one(publicacoesOab, {
    fields: [prazos.publicacaoOabId],
    references: [publicacoesOab.id],
  }),
  movimentacao: one(movimentacoes, {
    fields: [prazos.movimentacaoId],
    references: [movimentacoes.id],
  }),
  processo: one(processos, {
    fields: [prazos.processoId],
    references: [processos.id],
  }),
  prazosUsuarios: many(prazosUsuarios),
  subtarefas: many(prazoSubtarefas),
  tarefasInternas: many(tarefaInterna),
}));

export const prazoSubtarefasRelations = relations(prazoSubtarefas, ({ one }) => ({
  prazo: one(prazos, {
    fields: [prazoSubtarefas.idPrazo],
    references: [prazos.id],
  }),
}));

export const tarefaInternaRelations = relations(tarefaInterna, ({ one, many }) => ({
  prazo: one(prazos, {
    fields: [tarefaInterna.prazoId],
    references: [prazos.id],
  }),
  criador: one(usuarios, {
    fields: [tarefaInterna.idCriador],
    references: [usuarios.id],
    relationName: "tarefaInternaCriador",
  }),
  responsavel: one(usuarios, {
    fields: [tarefaInterna.idResponsavel],
    references: [usuarios.id],
    relationName: "tarefaInternaResponsavel",
  }),
  labels: many(tarefaInternaLabel),
}));

export const tarefaInternaLabelRelations = relations(tarefaInternaLabel, ({ one }) => ({
  tarefa: one(tarefaInterna, {
    fields: [tarefaInternaLabel.tarefaInternaId],
    references: [tarefaInterna.id],
  }),
  label: one(tarefaLabel, {
    fields: [tarefaInternaLabel.tarefaLabelId],
    references: [tarefaLabel.id],
  }),
}));

export const tarefaLabelRelations = relations(tarefaLabel, ({ many }) => ({
  tarefas: many(tarefaInternaLabel),
}));

export const movimentacoesRelations = relations(movimentacoes, ({ one, many }) => ({
  publicacaoOab: one(publicacoesOab, {
    fields: [movimentacoes.publicacaoOabId],
    references: [publicacoesOab.id],
  }),
  prazos: many(prazos),
}));

export const analiseIaPublicacaoRelations = relations(analiseIaPublicacao, ({ one }) => ({
  publicacaoOab: one(publicacoesOab, {
    fields: [analiseIaPublicacao.publicacaoOabId],
    references: [publicacoesOab.id],
  }),
}));

export const publicacoesOabRelations = relations(publicacoesOab, ({ one, many }) => ({
  processo: one(processos, {
    fields: [publicacoesOab.processoId],
    references: [processos.id],
  }),
  prazos: many(prazos),
  movimentacoes: many(movimentacoes),
  analiseIa: one(analiseIaPublicacao),
}));
