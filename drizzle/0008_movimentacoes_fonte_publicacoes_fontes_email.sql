-- Fonte da movimentação: email (extração do e-mail), ia (análise IA), escavador (dados Escavador)
ALTER TABLE "movimentacoes" ADD COLUMN IF NOT EXISTS "fonte" varchar(20) NOT NULL DEFAULT 'ia';

-- Registro de e-mails que enriqueceram a mesma publicação (ex.: outro advogado no processo)
ALTER TABLE "publicacoes_oab" ADD COLUMN IF NOT EXISTS "fontes_email" jsonb DEFAULT '[]'::jsonb;
