import { Response } from "express";
import { db } from "../db/index.js";
import { pessoas } from "../db/schema.js";
import { eq, ilike, and, or } from "drizzle-orm";
import type { RequestWithUser } from "../middleware/auth.js";
import { podeCadastrarPessoas } from "../lib/roles.js";

const PERFIL = ["gestor", "administrativo"] as const;

export type PessoaListItem = {
  id: number;
  nome: string;
  sobrenome: string;
  email: string | null;
  celular: string | null;
  tipo: string;
  numeroOab: string | null;
  ativo: boolean;
};

export async function listPessoas(
  req: RequestWithUser,
  res: Response<PessoaListItem[] | { error: string }>
): Promise<void> {
  try {
    if (!req.user || !podeCadastrarPessoas(req.user.perfil, req.user.grupo)) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    const q = (req.query.q as string)?.trim();
    const ativo = req.query.ativo as string | undefined;
    const conditions = [];
    if (q) {
      conditions.push(
        or(
          ilike(pessoas.nome, `%${q}%`),
          ilike(pessoas.sobrenome, `%${q}%`)
        )!
      );
    }
    if (ativo === "true" || ativo === "false") {
      conditions.push(eq(pessoas.ativo, ativo === "true"));
    }
    const list = await db
      .select({
        id: pessoas.id,
        nome: pessoas.nome,
        sobrenome: pessoas.sobrenome,
        email: pessoas.email,
        celular: pessoas.celular,
        tipo: pessoas.tipo,
        numeroOab: pessoas.numeroOab,
        ativo: pessoas.ativo,
      })
      .from(pessoas)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(pessoas.nome, pessoas.sobrenome);
    res.json(
      list.map((p) => ({
        id: p.id,
        nome: p.nome,
        sobrenome: p.sobrenome,
        email: p.email,
        celular: p.celular,
        tipo: p.tipo,
        numeroOab: p.numeroOab,
        ativo: p.ativo,
      }))
    );
  } catch (err) {
    console.error("List pessoas error:", err);
    res.status(500).json({ error: "Erro ao listar pessoas" });
  }
}

export async function createPessoa(
  req: RequestWithUser,
  res: Response<PessoaListItem | { error: string }>
): Promise<void> {
  try {
    if (!req.user || !podeCadastrarPessoas(req.user.perfil, req.user.grupo)) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    const { nome, sobrenome, email, celular, tipo, numeroOab } = req.body as {
      nome?: string;
      sobrenome?: string;
      email?: string;
      celular?: string;
      tipo?: string;
      numeroOab?: string;
    };
    if (!nome?.trim() || !sobrenome?.trim()) {
      res.status(400).json({ error: "Nome e sobrenome obrigatórios" });
      return;
    }
    const [p] = await db
      .insert(pessoas)
      .values({
        nome: nome.trim(),
        sobrenome: sobrenome.trim(),
        email: email?.trim() || null,
        celular: celular?.trim() || null,
        tipo: tipo === "advogado" || tipo === "cliente" ? tipo : "colaborador",
        numeroOab: numeroOab?.trim() || null,
        ativo: true,
      })
      .returning({
        id: pessoas.id,
        nome: pessoas.nome,
        sobrenome: pessoas.sobrenome,
        email: pessoas.email,
        celular: pessoas.celular,
        tipo: pessoas.tipo,
        numeroOab: pessoas.numeroOab,
        ativo: pessoas.ativo,
      });
    if (!p) {
      res.status(500).json({ error: "Erro ao criar pessoa" });
      return;
    }
    res.status(201).json({
      id: p.id,
      nome: p.nome,
      sobrenome: p.sobrenome,
      email: p.email,
      celular: p.celular,
      tipo: p.tipo,
      numeroOab: p.numeroOab,
      ativo: p.ativo,
    });
  } catch (err) {
    console.error("Create pessoa error:", err);
    res.status(500).json({ error: "Erro ao criar pessoa" });
  }
}

export async function updatePessoa(
  req: RequestWithUser,
  res: Response<PessoaListItem | { error: string }>
): Promise<void> {
  try {
    if (!req.user || !podeCadastrarPessoas(req.user.perfil, req.user.grupo)) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const { nome, sobrenome, email, celular, tipo, numeroOab, ativo } = req.body as {
      nome?: string;
      sobrenome?: string;
      email?: string;
      celular?: string;
      tipo?: string;
      numeroOab?: string;
      ativo?: boolean;
    };
    const updates: Partial<{
      nome: string;
      sobrenome: string;
      email: string | null;
      celular: string | null;
      tipo: string;
      numeroOab: string | null;
      ativo: boolean;
      updatedAt: Date;
    }> = { updatedAt: new Date() };
    if (nome !== undefined) updates.nome = nome.trim();
    if (sobrenome !== undefined) updates.sobrenome = sobrenome.trim();
    if (email !== undefined) updates.email = email?.trim() || null;
    if (celular !== undefined) updates.celular = celular?.trim() || null;
    if (tipo !== undefined) updates.tipo = tipo === "advogado" || tipo === "cliente" ? tipo : "colaborador";
    if (numeroOab !== undefined) updates.numeroOab = numeroOab?.trim() || null;
    if (ativo !== undefined) updates.ativo = Boolean(ativo);
    const [p] = await db
      .update(pessoas)
      .set(updates)
      .where(eq(pessoas.id, id))
      .returning({
        id: pessoas.id,
        nome: pessoas.nome,
        sobrenome: pessoas.sobrenome,
        email: pessoas.email,
        celular: pessoas.celular,
        tipo: pessoas.tipo,
        numeroOab: pessoas.numeroOab,
        ativo: pessoas.ativo,
      });
    if (!p) {
      res.status(404).json({ error: "Pessoa não encontrada" });
      return;
    }
    res.json({
      id: p.id,
      nome: p.nome,
      sobrenome: p.sobrenome,
      email: p.email,
      celular: p.celular,
      tipo: p.tipo,
      numeroOab: p.numeroOab,
      ativo: p.ativo,
    });
  } catch (err) {
    console.error("Update pessoa error:", err);
    res.status(500).json({ error: "Erro ao atualizar pessoa" });
  }
}
