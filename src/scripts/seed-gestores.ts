/**
 * Cria 2 usuários gestores iniciais.
 * Executar uma vez: DATABASE_URL=... npx tsx src/scripts/seed-gestores.ts
 */
import "dotenv/config";
import { db } from "../db/index.js";
import { pessoas, usuarios } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { hashSenha } from "../lib/auth.js";

const GESTORES = [
  {
    nome: "Feres",
    sobrenome: "Junqueira Najm",
    email: "feres.najm@lourencoenajm.adv.br",
    login: "feres.najm@lourencoenajm.adv.br",
    senha: "Carolgabi1206",
  },
  {
    nome: "Frederico",
    sobrenome: "Mazzo",
    email: "contato@fabricadosdados.com.br",
    login: "contato@fabricadosdados.com.br",
    senha: "Fs142779@1524",
  },
];

async function main() {
  for (const g of GESTORES) {
    const [existente] = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(eq(usuarios.login, g.login))
      .limit(1);
    if (existente) {
      console.log(`Usuário ${g.login} já existe. Pulando.`);
      continue;
    }

    const [p] = await db
      .insert(pessoas)
      .values({
        nome: g.nome,
        sobrenome: g.sobrenome,
        email: g.email,
        tipo: "colaborador",
        ativo: true,
      })
      .returning({ id: pessoas.id });

    if (!p) {
      console.error("Falha ao criar pessoa para", g.login);
      continue;
    }

    const senhaHash = await hashSenha(g.senha);
    await db.insert(usuarios).values({
      idPessoa: p.id,
      nome: g.nome,
      sobrenome: g.sobrenome,
      email: g.email,
      login: g.login,
      senha: senhaHash,
      grupo: "gestor",
      perfil: "gestor",
      ativo: true,
    });
    console.log(`Gestor criado: ${g.nome} ${g.sobrenome} (${g.login})`);
  }
  console.log("Concluído.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
