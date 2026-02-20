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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// --- Usuários (advogados e admin) ---
export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  sobrenome: varchar("sobrenome", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  celular: varchar("celular", { length: 255 }),
  login: varchar("login", { length: 255 }).notNull().unique(),
  senha: varchar("senha", { length: 255 }).notNull(),
  ativo: boolean("ativo").notNull().default(true),
  relatorio: varchar("relatorio", { length: 255 }).notNull().default("0"),
  grupo: varchar("grupo", { length: 255 }).notNull().default("usuario"),
  numeroOab: varchar("numero_oab", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  numeroProcesso: varchar("numero_processo", { length: 100 }),
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
    local: varchar("local", { length: 255 }),
    vara: varchar("vara", { length: 255 }),
    tipoPublicacao: varchar("tipo_publicacao", { length: 100 }),
    numeroProcesso: varchar("numero_processo", { length: 100 }),
    valorMencionado: varchar("valor_mencionado", { length: 100 }),
    textoCompleto: text("texto_completo"),
    advogados: jsonb("advogados").$type<{ nome: string; oab: string }[]>(),
    poloAtivo: varchar("polo_ativo", { length: 500 }),
    polosPassivos: jsonb("polos_passivos").$type<string[]>(),
    urlDocumento: varchar("url_documento", { length: 500 }),
    identificadorDocumento: varchar("identificador_documento", { length: 100 }),
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

// Relações
export const prazosRelations = relations(prazos, ({ one, many }) => ({
  publicacaoOab: one(publicacoesOab, {
    fields: [prazos.publicacaoOabId],
    references: [publicacoesOab.id],
  }),
  prazosUsuarios: many(prazosUsuarios),
}));

export const publicacoesOabRelations = relations(publicacoesOab, ({ many }) => ({
  prazos: many(prazos),
}));
