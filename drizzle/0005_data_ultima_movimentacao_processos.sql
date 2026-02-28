-- Enriquecimento Escavador: última movimentação exibida na listagem de processos
ALTER TABLE "processos" ADD COLUMN IF NOT EXISTS "data_ultima_movimentacao" date;
