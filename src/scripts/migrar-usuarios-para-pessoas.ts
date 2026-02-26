/**
 * Migração de dados: para cada registro em usuarios, cria uma pessoa e preenche
 * usuarios.id_pessoa e usuarios.perfil (a partir de grupo).
 * Executar uma vez após rodar a migração 0003: npx tsx src/scripts/migrar-usuarios-para-pessoas.ts
 */
import "dotenv/config";
import { db } from "../db/index.js";
import { usuarios, pessoas } from "../db/schema.js";
import { eq, isNull } from "drizzle-orm";

const GRUPO_TO_PERFIL: Record<string, string> = {
  gestor: "gestor",
  administrativo: "administrativo",
  advogado: "advogado",
  usuario: "advogado",
  consultivo: "consultivo",
};

async function main() {
  const list = await db.select().from(usuarios).where(isNull(usuarios.idPessoa));
  console.log(`Encontrados ${list.length} usuários sem id_pessoa.`);

  for (const u of list) {
    const [p] = await db
      .insert(pessoas)
      .values({
        nome: u.nome,
        sobrenome: u.sobrenome,
        email: u.email ?? null,
        celular: u.celular ?? null,
        tipo: u.numeroOab ? "advogado" : "colaborador",
        numeroOab: u.numeroOab ?? null,
        ativo: u.ativo,
      })
      .returning({ id: pessoas.id });

    if (!p) {
      console.error("Falha ao inserir pessoa para usuario id=", u.id);
      continue;
    }

    const perfil = GRUPO_TO_PERFIL[u.grupo?.toLowerCase() ?? ""] ?? "advogado";
    await db
      .update(usuarios)
      .set({ idPessoa: p.id, perfil })
      .where(eq(usuarios.id, u.id));
    console.log(`Usuario ${u.id} (${u.login}) -> pessoa ${p.id}, perfil ${perfil}`);
  }

  console.log("Migração concluída.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
