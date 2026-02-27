CREATE TABLE IF NOT EXISTS "clientes" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo" varchar(10) NOT NULL,
	"nome" varchar(255) NOT NULL,
	"razao_social" varchar(255),
	"cpf" varchar(20),
	"cnpj" varchar(20),
	"sexo" varchar(5),
	"data_nascimento" date,
	"telefone" varchar(50),
	"email" varchar(255),
	"endereco" varchar(255),
	"bairro" varchar(120),
	"cep" varchar(20),
	"cidade" varchar(120),
	"estado" varchar(5),
	"profissao" varchar(120),
	"estado_civil" varchar(50),
	"segmento_atuacao" varchar(120),
	"responsavel_legal" varchar(255),
	"como_conheceu" varchar(120),
	"observacoes" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "movimentacoes_processo" (
	"id" serial PRIMARY KEY NOT NULL,
	"id_processo" integer NOT NULL,
	"ordem" integer DEFAULT 1 NOT NULL,
	"movimentacao" text,
	"data_movimentacao" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "processos" (
	"id" serial PRIMARY KEY NOT NULL,
	"numero_cnj" varchar(50) NOT NULL,
	"status" varchar(30) DEFAULT 'Ativo' NOT NULL,
	"tipo" varchar(30),
	"fase" varchar(80),
	"tipo_acao" varchar(120),
	"tipo_cliente" varchar(20),
	"id_cliente" integer,
	"nome_cliente" varchar(255),
	"qualificacao_cliente" varchar(60),
	"outro_envolvido" varchar(255),
	"qualificacao_outro" varchar(60),
	"id_advogado_responsavel" integer,
	"nome_advogado" varchar(255),
	"valor_causa" varchar(50),
	"valor_acordo_sentenca" varchar(50),
	"valor_honorarios_reais" varchar(50),
	"valor_honorarios_percentual" varchar(30),
	"sucumbencias" varchar(100),
	"total_honorarios" varchar(100),
	"prazo_em_aberto" boolean,
	"data_prazo" date,
	"instancia" varchar(80),
	"comarca" varchar(120),
	"vara" varchar(120),
	"observacoes" text,
	"data_inicio" date,
	"data_fim" date,
	"duracao_texto" varchar(50),
	"resultado" varchar(80),
	"link_processo" varchar(500),
	"link_pasta_documentos" varchar(500),
	"titulo" varchar(400),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "processos_numero_cnj_unique" UNIQUE("numero_cnj")
);
--> statement-breakpoint
ALTER TABLE "prazos" ADD COLUMN "processo_id" integer;--> statement-breakpoint
ALTER TABLE "publicacoes_oab" ADD COLUMN "processo_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "movimentacoes_processo" ADD CONSTRAINT "movimentacoes_processo_id_processo_processos_id_fk" FOREIGN KEY ("id_processo") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processos" ADD CONSTRAINT "processos_id_cliente_clientes_id_fk" FOREIGN KEY ("id_cliente") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processos" ADD CONSTRAINT "processos_id_advogado_responsavel_usuarios_id_fk" FOREIGN KEY ("id_advogado_responsavel") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "processos_numero_cnj_idx" ON "processos" USING btree ("numero_cnj");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prazos" ADD CONSTRAINT "prazos_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "publicacoes_oab" ADD CONSTRAINT "publicacoes_oab_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
