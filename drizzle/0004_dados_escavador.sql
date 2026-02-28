-- Cache Escavador por OAB: evita pagar de novo; base para botão "Integrar dados"
CREATE TABLE IF NOT EXISTS "dados_escavador" (
  "id" serial PRIMARY KEY NOT NULL,
  "numero_cnj" varchar(50) NOT NULL,
  "advogado_nome" varchar(255),
  "advogado_oab_uf" varchar(5),
  "advogado_oab_numero" varchar(20),
  "data_inicio" date,
  "data_ultima_movimentacao" date,
  "data_ultima_verificacao" timestamp,
  "tribunal_sigla" varchar(20),
  "comarca" varchar(120),
  "vara" varchar(255),
  "classe_processual" varchar(200),
  "assunto_principal" varchar(500),
  "area" varchar(80),
  "status_predito" varchar(30),
  "titulo_polo_ativo" varchar(500),
  "titulo_polo_passivo" varchar(500),
  "valor_causa" varchar(50),
  "quantidade_movimentacoes" integer,
  "segredo_justica" boolean,
  "processo_principal_numero" varchar(50),
  "link_processo" varchar(500),
  "payload_completo" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "dados_escavador_numero_advogado_idx" ON "dados_escavador" ("numero_cnj", "advogado_oab_uf", "advogado_oab_numero");
