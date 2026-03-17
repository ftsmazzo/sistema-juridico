-- Checklist (subtarefas) por prazo para apoio à execução
CREATE TABLE IF NOT EXISTS "prazo_subtarefas" (
  "id" serial PRIMARY KEY NOT NULL,
  "id_prazo" integer NOT NULL REFERENCES "prazos"("id") ON DELETE CASCADE,
  "titulo" varchar(500) NOT NULL,
  "concluida" boolean NOT NULL DEFAULT false,
  "ordem" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL
);
