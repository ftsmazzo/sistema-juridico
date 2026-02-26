-- Tabela pessoas: cadastro único (advogados e não advogados; futuro: clientes)
CREATE TABLE IF NOT EXISTS "pessoas" (
  "id" serial PRIMARY KEY NOT NULL,
  "nome" varchar(255) NOT NULL,
  "sobrenome" varchar(255) NOT NULL,
  "email" varchar(255),
  "celular" varchar(50),
  "tipo" varchar(20) NOT NULL DEFAULT 'colaborador',
  "numero_oab" varchar(50),
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Usuários: vínculo com pessoa e perfil (consultivo | administrativo | advogado | gestor)
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "id_pessoa" integer REFERENCES "pessoas"("id") ON DELETE SET NULL;
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "perfil" varchar(30);
