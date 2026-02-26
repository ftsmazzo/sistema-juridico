import { Request, Response, NextFunction } from "express";
import { db } from "../db/index.js";
import { usuarios, pessoas } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { verifyToken, type UsuarioAuth } from "../lib/auth.js";
import { perfilEfetivo } from "../lib/roles.js";

export type RequestWithUser = Request & { user?: UsuarioAuth };

export async function requireAuth(
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): Promise<void> {
  const raw = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
  if (!raw) {
    res.status(401).json({ error: "Token não informado" });
    return;
  }
  const payload = verifyToken(raw);
  if (!payload) {
    res.status(401).json({ error: "Token inválido ou expirado" });
    return;
  }
  const [u] = await db
    .select({
      id: usuarios.id,
      login: usuarios.login,
      perfil: usuarios.perfil,
      grupo: usuarios.grupo,
      idPessoa: usuarios.idPessoa,
    })
    .from(usuarios)
    .where(eq(usuarios.id, payload.userId));
  if (!u || !u.login) {
    res.status(401).json({ error: "Usuário não encontrado" });
    return;
  }
  let pessoa: UsuarioAuth["pessoa"] = null;
  if (u.idPessoa) {
    const [p] = await db
      .select({ id: pessoas.id, nome: pessoas.nome, sobrenome: pessoas.sobrenome })
      .from(pessoas)
      .where(eq(pessoas.id, u.idPessoa));
    if (p) pessoa = p;
  }
  const perfil = perfilEfetivo(u.perfil ?? null, u.grupo ?? null);
  req.user = {
    id: u.id,
    login: u.login,
    perfil,
    grupo: u.grupo ?? "usuario",
    idPessoa: u.idPessoa ?? null,
    pessoa,
  };
  next();
}

/** Opcional: preenche req.user se houver token válido; não retorna 401 se não houver. */
export async function optionalAuth(
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): Promise<void> {
  const raw = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
  if (!raw) {
    next();
    return;
  }
  const payload = verifyToken(raw);
  if (!payload) {
    next();
    return;
  }
  const [u] = await db
    .select({
      id: usuarios.id,
      login: usuarios.login,
      perfil: usuarios.perfil,
      grupo: usuarios.grupo,
      idPessoa: usuarios.idPessoa,
    })
    .from(usuarios)
    .where(eq(usuarios.id, payload.userId));
  if (!u) {
    next();
    return;
  }
  let pessoa: UsuarioAuth["pessoa"] = null;
  if (u.idPessoa) {
    const [p] = await db
      .select({ id: pessoas.id, nome: pessoas.nome, sobrenome: pessoas.sobrenome })
      .from(pessoas)
      .where(eq(pessoas.id, u.idPessoa));
    if (p) pessoa = p;
  }
  req.user = {
    id: u.id,
    login: u.login,
    perfil: perfilEfetivo(u.perfil ?? null, u.grupo ?? null),
    grupo: u.grupo ?? "usuario",
    idPessoa: u.idPessoa ?? null,
    pessoa,
  };
  next();
}

export function requirePerfil(...perfis: string[]) {
  return (req: RequestWithUser, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }
    if (!perfis.includes(req.user.perfil)) {
      res.status(403).json({ error: "Sem permissão para esta ação" });
      return;
    }
    next();
  };
}
