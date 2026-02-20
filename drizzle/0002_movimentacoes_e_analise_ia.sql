-- Tabela movimentações: uma publicação pode ter N movimentações (IA)
CREATE TABLE IF NOT EXISTS "movimentacoes" (
  "id" serial PRIMARY KEY NOT NULL,
  "publicacao_oab_id" integer NOT NULL REFERENCES "publicacoes_oab"("id") ON DELETE CASCADE,
  "tipo" varchar(100) NOT NULL,
  "resumo" text,
  "ordem" integer NOT NULL DEFAULT 1,
  "prazo_dias_uteis" integer,
  "data_limite" date,
  "base_legal" varchar(255),
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Tabela análise IA: 1:1 com publicação (resumo, observações, resposta completa)
CREATE TABLE IF NOT EXISTS "analise_ia_publicacao" (
  "id" serial PRIMARY KEY NOT NULL,
  "publicacao_oab_id" integer NOT NULL UNIQUE REFERENCES "publicacoes_oab"("id") ON DELETE CASCADE,
  "resumo" text,
  "observacoes_ia" text,
  "base_legal_geral" varchar(255),
  "resposta_completa" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Prazos podem ser vinculados a uma movimentação (ex.: intimação específica)
ALTER TABLE "prazos" ADD COLUMN IF NOT EXISTS "movimentacao_id" integer REFERENCES "movimentacoes"("id") ON DELETE SET NULL;
