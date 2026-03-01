-- Conta de e-mail para monitoramento (IMAP). Verificação automática; extração cria só publicações; análise IA no N8N (botão).
CREATE TABLE IF NOT EXISTS "conta_email_monitoramento" (
  "id" serial PRIMARY KEY NOT NULL,
  "nome" varchar(255) DEFAULT 'Conta principal' NOT NULL,
  "host" varchar(255) NOT NULL,
  "port" integer DEFAULT 993 NOT NULL,
  "secure" boolean DEFAULT true NOT NULL,
  "user" varchar(255) NOT NULL,
  "password_encrypted" text,
  "remetentes_filtro" jsonb DEFAULT '[]'::jsonb,
  "interval_minutes" integer DEFAULT 15 NOT NULL,
  "last_checked_at" timestamp,
  "last_error" text,
  "ativo" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
