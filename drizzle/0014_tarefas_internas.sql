-- Labels globais para tarefas internas (nome único ignorando maiúsculas e espaços nas pontas)
CREATE TABLE IF NOT EXISTS "tarefa_label" (
  "id" serial PRIMARY KEY NOT NULL,
  "nome" varchar(120) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "tarefa_label_nome_lower_trim"
  ON "tarefa_label" (lower(trim(both from "nome")));

-- Tarefas internas do escritório (sempre vinculadas a um prazo judicial)
CREATE TABLE IF NOT EXISTS "tarefa_interna" (
  "id" serial PRIMARY KEY NOT NULL,
  "prazo_id" integer NOT NULL REFERENCES "prazos"("id") ON DELETE CASCADE,
  "titulo" varchar(500) NOT NULL,
  "descricao" text,
  "tipo" varchar(40) NOT NULL,
  "data_limite" date NOT NULL,
  "id_criador" integer NOT NULL REFERENCES "usuarios"("id") ON DELETE RESTRICT,
  "id_responsavel" integer NOT NULL REFERENCES "usuarios"("id") ON DELETE RESTRICT,
  "status" varchar(20) NOT NULL DEFAULT 'pendente',
  "cumprida_em" timestamp,
  "cumprido_por" integer REFERENCES "usuarios"("id") ON DELETE SET NULL,
  "d3_enviado_em" timestamp,
  "cobranca_ultima_em" timestamp,
  "criacao_notificada_em" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "tarefa_interna_prazo_id_idx" ON "tarefa_interna" ("prazo_id");
CREATE INDEX IF NOT EXISTS "tarefa_interna_responsavel_idx" ON "tarefa_interna" ("id_responsavel");
CREATE INDEX IF NOT EXISTS "tarefa_interna_criador_idx" ON "tarefa_interna" ("id_criador");
CREATE INDEX IF NOT EXISTS "tarefa_interna_data_limite_idx" ON "tarefa_interna" ("data_limite");
CREATE INDEX IF NOT EXISTS "tarefa_interna_status_idx" ON "tarefa_interna" ("status");

-- N:N tarefa ↔ label
CREATE TABLE IF NOT EXISTS "tarefa_interna_label" (
  "tarefa_interna_id" integer NOT NULL REFERENCES "tarefa_interna"("id") ON DELETE CASCADE,
  "tarefa_label_id" integer NOT NULL REFERENCES "tarefa_label"("id") ON DELETE CASCADE,
  PRIMARY KEY ("tarefa_interna_id", "tarefa_label_id")
);
