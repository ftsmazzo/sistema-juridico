CREATE TABLE IF NOT EXISTS "agenda" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(150) DEFAULT '' NOT NULL,
	"telefone" varchar(150) DEFAULT '' NOT NULL,
	"celular" varchar(150),
	"email" varchar(150),
	"endereco" varchar(150),
	"nascimento" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analise_ia_publicacao" (
	"id" serial PRIMARY KEY NOT NULL,
	"publicacao_oab_id" integer NOT NULL,
	"resumo" text,
	"observacoes_ia" text,
	"base_legal_geral" varchar(255),
	"resposta_completa" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "analise_ia_publicacao_publicacao_oab_id_unique" UNIQUE("publicacao_oab_id")
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audiencias_usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"id_audiencia" integer NOT NULL,
	"id_usuario" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "movimentacoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"publicacao_oab_id" integer NOT NULL,
	"tipo" varchar(100) NOT NULL,
	"resumo" text,
	"ordem" integer DEFAULT 1 NOT NULL,
	"prazo_dias_uteis" integer,
	"data_limite" date,
	"base_legal" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pessoas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(255) NOT NULL,
	"sobrenome" varchar(255) NOT NULL,
	"email" varchar(255),
	"celular" varchar(50),
	"tipo" varchar(20) DEFAULT 'colaborador' NOT NULL,
	"numero_oab" varchar(50),
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prazos" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"data" date NOT NULL,
	"observacao" text DEFAULT '',
	"conteudo" text DEFAULT '' NOT NULL,
	"prazo" varchar(255) NOT NULL,
	"status" integer DEFAULT 0 NOT NULL,
	"data_cumprido" date,
	"datahoracumprido" timestamp,
	"publicacao_oab_id" integer,
	"movimentacao_id" integer,
	"numero_processo" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prazos_usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"id_prazo" integer NOT NULL,
	"id_usuario" integer NOT NULL
);
--> statement-breakpoint
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
	"resumo" text,
	"base_legal" varchar(255),
	"prazo_dias_uteis_sugerido" integer,
	"observacoes_ia" text,
	"movimentacoes" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"id_pessoa" integer,
	"nome" varchar(255) NOT NULL,
	"sobrenome" varchar(255) NOT NULL,
	"email" varchar(255),
	"celular" varchar(255),
	"login" varchar(255) NOT NULL,
	"senha" varchar(255) NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"relatorio" varchar(255) DEFAULT '0' NOT NULL,
	"grupo" varchar(255) DEFAULT 'usuario' NOT NULL,
	"perfil" varchar(30),
	"numero_oab" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_login_unique" UNIQUE("login")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analise_ia_publicacao" ADD CONSTRAINT "analise_ia_publicacao_publicacao_oab_id_publicacoes_oab_id_fk" FOREIGN KEY ("publicacao_oab_id") REFERENCES "public"."publicacoes_oab"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audiencias_usuarios" ADD CONSTRAINT "audiencias_usuarios_id_audiencia_audiencias_id_fk" FOREIGN KEY ("id_audiencia") REFERENCES "public"."audiencias"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audiencias_usuarios" ADD CONSTRAINT "audiencias_usuarios_id_usuario_usuarios_id_fk" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_publicacao_oab_id_publicacoes_oab_id_fk" FOREIGN KEY ("publicacao_oab_id") REFERENCES "public"."publicacoes_oab"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prazos" ADD CONSTRAINT "prazos_publicacao_oab_id_publicacoes_oab_id_fk" FOREIGN KEY ("publicacao_oab_id") REFERENCES "public"."publicacoes_oab"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prazos" ADD CONSTRAINT "prazos_movimentacao_id_movimentacoes_id_fk" FOREIGN KEY ("movimentacao_id") REFERENCES "public"."movimentacoes"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prazos_usuarios" ADD CONSTRAINT "prazos_usuarios_id_prazo_prazos_id_fk" FOREIGN KEY ("id_prazo") REFERENCES "public"."prazos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prazos_usuarios" ADD CONSTRAINT "prazos_usuarios_id_usuario_usuarios_id_fk" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_id_pessoa_pessoas_id_fk" FOREIGN KEY ("id_pessoa") REFERENCES "public"."pessoas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "publicacoes_oab_email_num" ON "publicacoes_oab" USING btree ("email_id","publicacao_numero");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "publicacoes_oab_processo_doc" ON "publicacoes_oab" USING btree ("numero_processo","identificador_documento");