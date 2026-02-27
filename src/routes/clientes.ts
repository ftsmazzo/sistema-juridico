import { Response } from "express";
import { db } from "../db/index.js";
import { clientes } from "../db/schema.js";
import { eq, ilike, and, or, asc } from "drizzle-orm";
import type { RequestWithUser } from "../middleware/auth.js";
import { podeCadastrarPessoas } from "../lib/roles.js";

export type ClienteListItem = {
  id: number;
  tipo: string;
  nome: string;
  razaoSocial: string | null;
  cpf: string | null;
  cnpj: string | null;
  cidade: string | null;
  estado: string | null;
  ativo: boolean;
};

export async function listClientes(
  req: RequestWithUser,
  res: Response<ClienteListItem[] | { error: string }>
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }
    const q = (req.query.q as string)?.trim();
    const tipo = req.query.tipo as string | undefined;
    const conditions = [];
    if (q) {
      conditions.push(
        or(
          ilike(clientes.nome, `%${q}%`),
          ilike(clientes.razaoSocial, `%${q}%`),
          ilike(clientes.cpf, `%${q}%`),
          ilike(clientes.cnpj, `%${q}%`)
        )!
      );
    }
    if (tipo === "PF" || tipo === "PJ") {
      conditions.push(eq(clientes.tipo, tipo));
    }
    const list = await db
      .select({
        id: clientes.id,
        tipo: clientes.tipo,
        nome: clientes.nome,
        razaoSocial: clientes.razaoSocial,
        cpf: clientes.cpf,
        cnpj: clientes.cnpj,
        cidade: clientes.cidade,
        estado: clientes.estado,
        ativo: clientes.ativo,
      })
      .from(clientes)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(clientes.nome));
    res.json(list);
  } catch (err) {
    console.error("List clientes:", err);
    res.status(500).json({ error: "Erro ao listar clientes" });
  }
}

export async function getClienteById(
  req: RequestWithUser,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const [c] = await db.select().from(clientes).where(eq(clientes.id, id)).limit(1);
    if (!c) {
      res.status(404).json({ error: "Cliente não encontrado" });
      return;
    }
    res.json(c);
  } catch (err) {
    console.error("Get cliente:", err);
    res.status(500).json({ error: "Erro ao buscar cliente" });
  }
}

export async function createCliente(
  req: RequestWithUser,
  res: Response
): Promise<void> {
  try {
    if (!req.user || !podeCadastrarPessoas(req.user.perfil, req.user.grupo)) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const [inserted] = await db
      .insert(clientes)
      .values({
        tipo: (body.tipo as string) || "PF",
        nome: (body.nome as string)?.trim() || "",
        razaoSocial: (body.razaoSocial as string)?.trim() || undefined,
        cpf: (body.cpf as string)?.trim() || undefined,
        cnpj: (body.cnpj as string)?.trim() || undefined,
        sexo: (body.sexo as string)?.trim() || undefined,
        dataNascimento: (body.dataNascimento as string) || undefined,
        telefone: (body.telefone as string)?.trim() || undefined,
        email: (body.email as string)?.trim() || undefined,
        endereco: (body.endereco as string)?.trim() || undefined,
        bairro: (body.bairro as string)?.trim() || undefined,
        cep: (body.cep as string)?.trim() || undefined,
        cidade: (body.cidade as string)?.trim() || undefined,
        estado: (body.estado as string)?.trim() || undefined,
        profissao: (body.profissao as string)?.trim() || undefined,
        estadoCivil: (body.estadoCivil as string)?.trim() || undefined,
        segmentoAtuacao: (body.segmentoAtuacao as string)?.trim() || undefined,
        responsavelLegal: (body.responsavelLegal as string)?.trim() || undefined,
        comoConheceu: (body.comoConheceu as string)?.trim() || undefined,
        observacoes: (body.observacoes as string)?.trim() || undefined,
      })
      .returning();
    if (!inserted) {
      res.status(500).json({ error: "Erro ao criar cliente" });
      return;
    }
    res.status(201).json(inserted);
  } catch (err) {
    console.error("Create cliente:", err);
    res.status(500).json({ error: "Erro ao criar cliente" });
  }
}

export async function updateCliente(
  req: RequestWithUser,
  res: Response
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
    const body = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    const allowed = [
      "tipo", "nome", "razaoSocial", "cpf", "cnpj", "sexo", "dataNascimento",
      "telefone", "email", "endereco", "bairro", "cep", "cidade", "estado",
      "profissao", "estadoCivil", "segmentoAtuacao", "responsavelLegal",
      "comoConheceu", "observacoes", "ativo",
    ];
    for (const key of allowed) {
      if (body[key] !== undefined) {
        const v = body[key];
        if (typeof v === "string") (update as Record<string, string | null>)[key] = v.trim() || null;
        else (update as Record<string, unknown>)[key] = v;
      }
    }
    if (Object.keys(update).length === 0) {
      res.status(400).json({ error: "Nenhum campo para atualizar" });
      return;
    }
    const [updated] = await db
      .update(clientes)
      .set(update as Record<string, unknown>)
      .where(eq(clientes.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Cliente não encontrado" });
      return;
    }
    res.json(updated);
  } catch (err) {
    console.error("Update cliente:", err);
    res.status(500).json({ error: "Erro ao atualizar cliente" });
  }
}
