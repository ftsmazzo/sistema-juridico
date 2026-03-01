-- Token para link de inscrição do calendário (.ics) por usuário
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "calendar_feed_token" varchar(64) UNIQUE;
