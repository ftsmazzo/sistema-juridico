-- Vincula conta de e-mail a usuário/OAB para notificação WhatsApp
ALTER TABLE "conta_email_monitoramento" ADD COLUMN IF NOT EXISTS "id_usuario" integer REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "conta_email_monitoramento" ADD COLUMN IF NOT EXISTS "numero_oab" varchar(50);

-- Conta de teste existente: vincular ao usuário id 2 (OAB 270074)
UPDATE "conta_email_monitoramento" SET "id_usuario" = 2, "numero_oab" = '270074' WHERE "id" = (SELECT MIN("id") FROM "conta_email_monitoramento") AND "id_usuario" IS NULL;
