import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-alterar-em-producao";
const BCRYPT_ROUNDS = 10;

export type UsuarioAuth = {
  id: number;
  login: string;
  perfil: string;
  grupo: string;
  idPessoa: number | null;
  pessoa: { id: number; nome: string; sobrenome: string } | null;
};

export function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, BCRYPT_ROUNDS);
}

export async function compararSenha(senha: string, hashOuLegado: string): Promise<boolean> {
  if (hashOuLegado.startsWith("$2")) return bcrypt.compare(senha, hashOuLegado);
  return senha === hashOuLegado;
}

export function signToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    return payload;
  } catch {
    return null;
  }
}
