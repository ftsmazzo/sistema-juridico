import { Response } from "express";
import { db } from "../db/index.js";
import { usuarios, pessoas } from "../db/schema.js";
import { eq, inArray } from "drizzle-orm";
import type { RequestWithUser } from "../middleware/auth.js";
import { podeGerenciarUsuarios } from "../lib/roles.js";
import { hashSenha } from "../lib/auth.js";
import { perfilEfetivo } from "../lib/roles.js";

export type UsuarioListItem = {
  id: number;
  login: string;
  perfil: string;
  ativo: boolean;
  idPessoa: number | null;
  pessoa: { id: number; nome: string; sobrenome: string } | null;
};

export async function listUsuarios(
  req: RequestWithUser,
  res: Response<UsuarioListItem[] | { error: string }>
): Promise<void> {
  try {
    if (!req.user || !podeGerenciarUsuarios(req.user.perfil, req.user.grupo)) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    const q = (req.query.q as string)?.trim();
    const list = await db
      .select({
        id: usuarios.id,
        login: usuarios.login,
        perfil: usuarios.perfil,
        grupo: usuarios.grupo,
        ativo: usuarios.ativo,
        idPessoa: usuarios.idPessoa,
      })
      .from(usuarios)
      .orderBy(usuarios.login);
    const idsPessoas = [...new Set(list.map((u) => u.idPessoa).filter(Boolean))] as number[];
    const pessoasMap = new Map<number, { id: number; nome: string; sobrenome: string }>();
    if (idsPessoas.length > 0) {
      const pessoasList = await db
        .select({ id: pessoas.id, nome: pessoas.nome, sobrenome: pessoas.sobrenome })
        .from(pessoas)
        .where(inArray(pessoas.id, idsPessoas));
      for (const p of pessoasList) pessoasMap.set(p.id, p);
    }
    let result: UsuarioListItem[] = list.map((u) => ({
      id: u.id,
      login: u.login,
      perfil: perfilEfetivo(u.perfil ?? null, u.grupo ?? null),
      ativo: u.ativo,
      idPessoa: u.idPessoa,
      pessoa: u.idPessoa ? pessoasMap.get(u.idPessoa) ?? null : null,
    }));
    if (q) {
      const lower = q.toLowerCase();
      result = result.filter(
        (u) =>
          u.login.toLowerCase().includes(lower) ||
          (u.pessoa && (u.pessoa.nome.toLowerCase().includes(lower) || u.pessoa.sobrenome.toLowerCase().includes(lower)))
      );
    }
    res.json(result);
  } catch (err) {
    console.error("List usuarios error:", err);
    res.status(500).json({ error: "Erro ao listar usuários" });
  }
}

export async function createUsuario(
  req: RequestWithUser,
  res: Response<UsuarioListItem | { error: string }>
): Promise<void> {
  try {
    if (!req.user || !podeGerenciarUsuarios(req.user.perfil, req.user.grupo)) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    const { idPessoa, login, senha, perfil } = req.body as {
      idPessoa?: number;
      login?: string;
      senha?: string;
      perfil?: string;
    };
    if (!login?.trim() || !senha) {
      res.status(400).json({ error: "Login e senha obrigatórios" });
      return;
    }
    const perfilValido = ["consultivo", "administrativo", "advogado", "gestor"].includes(perfil ?? "")
      ? perfil
      : "advogado";
    const senhaHash = await hashSenha(senha);
    const [u] = await db
      .insert(usuarios)
      .values({
        idPessoa: idPessoa && Number.isInteger(idPessoa) ? idPessoa : null,
        nome: "", // legado; pode vir da pessoa depois
        sobrenome: "",
        login: login.trim(),
        senha: senhaHash,
        grupo: perfilValido,
        perfil: perfilValido,
        ativo: true,
      })
      .returning({
        id: usuarios.id,
        login: usuarios.login,
        perfil: usuarios.perfil,
        grupo: usuarios.grupo,
        ativo: usuarios.ativo,
        idPessoa: usuarios.idPessoa,
      });
    if (!u) {
      res.status(500).json({ error: "Erro ao criar usuário" });
      return;
    }
    let pessoa: UsuarioListItem["pessoa"] = null;
    if (u.idPessoa) {
      const [p] = await db
        .select({ id: pessoas.id, nome: pessoas.nome, sobrenome: pessoas.sobrenome })
        .from(pessoas)
        .where(eq(pessoas.id, u.idPessoa!));
      if (p) pessoa = p;
    }
    res.status(201).json({
      id: u.id,
      login: u.login,
      perfil: perfilEfetivo(u.perfil ?? null, u.grupo ?? null),
      ativo: u.ativo,
      idPessoa: u.idPessoa,
      pessoa,
    });
  } catch (err: unknown) {
    const msg = err && typeof err === "object" && "code" in err && (err as { code: string }).code === "23505"
      ? "Login já existe"
      : "Erro ao criar usuário";
    console.error("Create usuario error:", err);
    res.status(500).json({ error: msg });
  }
}

export async function updateUsuario(
  req: RequestWithUser,
  res: Response<UsuarioListItem | { error: string }>
): Promise<void> {
  try {
    if (!req.user || !podeGerenciarUsuarios(req.user.perfil, req.user.grupo)) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const { idPessoa, perfil, ativo, senha } = req.body as {
      idPessoa?: number | null;
      perfil?: string;
      ativo?: boolean;
      senha?: string;
    };
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (idPessoa !== undefined) updates.idPessoa = idPessoa && Number.isInteger(idPessoa) ? idPessoa : null;
    if (perfil !== undefined && ["consultivo", "administrativo", "advogado", "gestor"].includes(perfil)) {
      updates.perfil = perfil;
      updates.grupo = perfil;
    }
    if (ativo !== undefined) updates.ativo = Boolean(ativo);
    if (senha?.trim()) updates.senha = await hashSenha(senha);
    const [u] = await db
      .update(usuarios)
      .set(updates as Record<string, unknown>)
      .where(eq(usuarios.id, id))
      .returning({
        id: usuarios.id,
        login: usuarios.login,
        perfil: usuarios.perfil,
        grupo: usuarios.grupo,
        ativo: usuarios.ativo,
        idPessoa: usuarios.idPessoa,
      });
    if (!u) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    let pessoa: UsuarioListItem["pessoa"] = null;
    if (u.idPessoa) {
      const [p] = await db
        .select({ id: pessoas.id, nome: pessoas.nome, sobrenome: pessoas.sobrenome })
        .from(pessoas)
        .where(eq(pessoas.id, u.idPessoa));
      if (p) pessoa = p;
    }
    res.json({
      id: u.id,
      login: u.login,
      perfil: perfilEfetivo(u.perfil ?? null, u.grupo ?? null),
      ativo: u.ativo,
      idPessoa: u.idPessoa,
      pessoa,
    });
  } catch (err) {
    console.error("Update usuario error:", err);
    res.status(500).json({ error: "Erro ao atualizar usuário" });
  }
}
