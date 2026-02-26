import { Request, Response } from "express";
import { db } from "../db/index.js";
import { usuarios, pessoas } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { compararSenha, signToken } from "../lib/auth.js";
import { perfilEfetivo } from "../lib/roles.js";

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { login: loginBody, senha } = req.body as { login?: string; senha?: string };
    if (!loginBody?.trim() || !senha) {
      res.status(400).json({ error: "Login e senha obrigatórios" });
      return;
    }
    const [u] = await db
      .select({
        id: usuarios.id,
        login: usuarios.login,
        senha: usuarios.senha,
        perfil: usuarios.perfil,
        grupo: usuarios.grupo,
        idPessoa: usuarios.idPessoa,
        ativo: usuarios.ativo,
      })
      .from(usuarios)
      .where(eq(usuarios.login, loginBody.trim()));
    if (!u || !u.ativo) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }
    const ok = await compararSenha(senha, u.senha);
    if (!ok) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }
    let pessoa: { id: number; nome: string; sobrenome: string } | null = null;
    if (u.idPessoa) {
      const [p] = await db
        .select({ id: pessoas.id, nome: pessoas.nome, sobrenome: pessoas.sobrenome })
        .from(pessoas)
        .where(eq(pessoas.id, u.idPessoa));
      if (p) pessoa = p;
    }
    const perfil = perfilEfetivo(u.perfil ?? null, u.grupo ?? null);
    const token = signToken(u.id);
    res.json({
      token,
      user: {
        id: u.id,
        login: u.login,
        perfil,
        grupo: u.grupo,
        idPessoa: u.idPessoa,
        pessoa,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Erro ao autenticar" });
  }
}
