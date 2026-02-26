/**
 * Perfis de usuário do sistema (4 tipos).
 * Usar em usuarios.perfil (ou usuarios.grupo até migração completa).
 */

export const PERFIL = {
  CONSULTIVO: "consultivo",
  ADMINISTRATIVO: "administrativo",
  ADVOGADO: "advogado",
  GESTOR: "gestor",
} as const;

/** Legado: grupo "usuario" tratado como advogado até migração */
export const GRUPO = {
  ...PERFIL,
  USUARIO: "usuario",
} as const;

export type PerfilUsuario = (typeof PERFIL)[keyof typeof PERFIL];
export type GrupoUsuario = (typeof GRUPO)[keyof typeof GRUPO];

/** Retorna o perfil efetivo (perfil ?? grupo legado) */
export function perfilEfetivo(perfil: string | null | undefined, grupo: string | null | undefined): string {
  if (perfil && Object.values(PERFIL).includes(perfil as PerfilUsuario)) return perfil;
  if (grupo === GRUPO.USUARIO) return PERFIL.ADVOGADO;
  return grupo ?? PERFIL.ADVOGADO;
}

export function ehConsultivo(perfil: string | null | undefined, grupo?: string | null): boolean {
  const p = perfilEfetivo(perfil, grupo);
  return p === PERFIL.CONSULTIVO;
}

export function ehAdministrativo(perfil: string | null | undefined, grupo?: string | null): boolean {
  const p = perfilEfetivo(perfil, grupo);
  return p === PERFIL.ADMINISTRATIVO;
}

export function ehGestor(perfil: string | null | undefined, grupo?: string | null): boolean {
  const p = perfilEfetivo(perfil, grupo);
  return p === PERFIL.GESTOR;
}

export function ehAdvogado(perfil: string | null | undefined, grupo?: string | null): boolean {
  const p = perfilEfetivo(perfil, grupo);
  return p === PERFIL.ADVOGADO || p === GRUPO.USUARIO;
}

/** Apenas consulta (leitura); não cria/edita/exclui */
export function podeApenasConsultar(perfil: string | null | undefined, grupo?: string | null): boolean {
  return ehConsultivo(perfil, grupo);
}

/** Pode gerenciar usuários e pessoas (criar/editar/inativar, atribuir perfil) */
export function podeGerenciarUsuarios(perfil: string | null | undefined, grupo?: string | null): boolean {
  return ehGestor(perfil, grupo);
}

/** Pode ver todos os prazos (e audiências) do escritório; caso contrário, só os próprios */
export function podeVerTodosPrazos(perfil: string | null | undefined, grupo?: string | null): boolean {
  return ehGestor(perfil, grupo) || ehAdministrativo(perfil, grupo);
}

/** Pode editar (criar/atualizar/excluir) qualquer prazo/audiência; caso contrário, só os próprios/atribuídos */
export function podeEditarTodosPrazos(perfil: string | null | undefined, grupo?: string | null): boolean {
  return ehGestor(perfil, grupo);
}

/** Pode cadastrar/editar pessoas (informações básicas) — Gestor e Administrativo */
export function podeCadastrarPessoas(perfil: string | null | undefined, grupo?: string | null): boolean {
  return ehGestor(perfil, grupo) || ehAdministrativo(perfil, grupo);
}
