-- Link da peça/documento ao dar cumprimento ao prazo (OneDrive, etc.)
ALTER TABLE "prazos" ADD COLUMN IF NOT EXISTS "link_peca" varchar(1000);
