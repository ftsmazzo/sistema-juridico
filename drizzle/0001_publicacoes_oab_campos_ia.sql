-- Campos enriquecidos pela IA (workflow N8N). Idempotente: ADD COLUMN IF NOT EXISTS.

ALTER TABLE "publicacoes_oab" ADD COLUMN IF NOT EXISTS "resumo" text;
ALTER TABLE "publicacoes_oab" ADD COLUMN IF NOT EXISTS "base_legal" varchar(255);
ALTER TABLE "publicacoes_oab" ADD COLUMN IF NOT EXISTS "prazo_dias_uteis_sugerido" integer;
ALTER TABLE "publicacoes_oab" ADD COLUMN IF NOT EXISTS "observacoes_ia" text;
ALTER TABLE "publicacoes_oab" ADD COLUMN IF NOT EXISTS "movimentacoes" jsonb;
