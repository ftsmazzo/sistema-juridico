/**
 * Cria os 2 usuários gestores iniciais se ainda não existirem.
 * Chamado na subida da API (deploy) e pelo script db:seed-gestores.
 */
import { db } from "./index.js";
import { pessoas, usuarios } from "./schema.js";
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

export async function runSeedGestores(): Promise<void> {
  for (const g of GESTORES) {
    const [existente] = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(eq(usuarios.login, g.login))
      .limit(1);
    if (existente) continue;

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

    if (!p) continue;

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
    console.log(`[seed] Gestor criado: ${g.nome} ${g.sobrenome} (${g.login})`);
  }
}
