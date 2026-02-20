-- Migração inicial: cria todas as tabelas (idempotente com IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS "usuarios" (
  "id" serial PRIMARY KEY NOT NULL,
  "nome" varchar(255) NOT NULL,
  "sobrenome" varchar(255) NOT NULL,
  "email" varchar(255),
  "celular" varchar(255),
  "login" varchar(255) NOT NULL UNIQUE,
  "senha" varchar(255) NOT NULL,
  "ativo" boolean NOT NULL DEFAULT true,
  "relatorio" varchar(255) NOT NULL DEFAULT '0',
  "grupo" varchar(255) NOT NULL DEFAULT 'usuario',
  "numero_oab" varchar(50),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "publicacoes_oab" (
  "id" serial PRIMARY KEY NOT NULL,
  "email_id" varchar(255) NOT NULL,
  "subject" varchar(500),
  "date_email" timestamp,
  "from_email" varchar(255),
  "to_email" varchar(255),
  "advogado_principal" varchar(255),
  "numero_oab" varchar(50),
  "data_processamento" varchar(100),
  "total_publicacoes" integer,
  "publicacao_numero" integer NOT NULL,
  "data_disponibilizacao" varchar(50),
  "data_publicacao" varchar(50),
  "jornal" varchar(255),
  "pagina" varchar(50),
  "caderno" varchar(100),
  "local" varchar(255),
  "vara" varchar(255),
  "tipo_publicacao" varchar(100),
  "numero_processo" varchar(100),
  "valor_mencionado" varchar(100),
  "texto_completo" text,
  "advogados" jsonb,
  "polo_ativo" varchar(500),
  "polos_passivos" jsonb,
  "url_documento" varchar(500),
  "identificador_documento" varchar(100),
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "publicacoes_oab_email_num" ON "publicacoes_oab" ("email_id","publicacao_numero");
CREATE UNIQUE INDEX IF NOT EXISTS "publicacoes_oab_processo_doc" ON "publicacoes_oab" ("numero_processo","identificador_documento");

CREATE TABLE IF NOT EXISTS "prazos" (
  "id" serial PRIMARY KEY NOT NULL,
  "tipo" varchar(50) NOT NULL,
  "data" date NOT NULL,
  "observacao" text DEFAULT '',
  "conteudo" text NOT NULL DEFAULT '',
  "prazo" varchar(255) NOT NULL,
  "status" integer NOT NULL DEFAULT 0,
  "data_cumprido" date,
  "datahoracumprido" timestamp,
  "publicacao_oab_id" integer REFERENCES "publicacoes_oab"("id") ON DELETE SET NULL,
  "numero_processo" varchar(100),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "prazos_usuarios" (
  "id" serial PRIMARY KEY NOT NULL,
  "id_prazo" integer NOT NULL REFERENCES "prazos"("id") ON DELETE CASCADE,
  "id_usuario" integer NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "audiencias" (
  "id" serial PRIMARY KEY NOT NULL,
  "num_processo" varchar(150) NOT NULL,
  "vara" varchar(150) NOT NULL,
  "local" varchar(150) NOT NULL,
  "reclamante" varchar(150),
  "reclamado" varchar(150),
  "preposto" varchar(150),
  "datahora" timestamp NOT NULL,
  "observacao" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "audiencias_usuarios" (
  "id" serial PRIMARY KEY NOT NULL,
  "id_audiencia" integer NOT NULL REFERENCES "audiencias"("id") ON DELETE CASCADE,
  "id_usuario" integer NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "agenda" (
  "id" serial PRIMARY KEY NOT NULL,
  "nome" varchar(150) NOT NULL DEFAULT '',
  "telefone" varchar(150) NOT NULL DEFAULT '',
  "celular" varchar(150),
  "email" varchar(150),
  "endereco" varchar(150),
  "nascimento" date,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
