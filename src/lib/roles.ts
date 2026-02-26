/**
 * Grupos (perfis) de usuário do sistema.
 * Usar estes valores no campo usuarios.grupo e nas checagens de permissão.
 */

export const GRUPO = {
  ADMINISTRATIVO: "administrativo",
  GESTOR: "gestor",
  ADVOGADO: "advogado",
  /** Legado: tratar como advogado até migração */
  USUARIO: "usuario",
} as const;

export type GrupoUsuario =
  (typeof GRUPO)[keyof typeof GRUPO];

export function ehAdministrativo(grupo: string | null | undefined): boolean {
  return grupo === GRUPO.ADMINISTRATIVO;
}

export function ehGestor(grupo: string | null | undefined): boolean {
  return grupo === GRUPO.GESTOR;
}

export function ehAdvogado(grupo: string | null | undefined): boolean {
  return grupo === GRUPO.ADVOGADO || grupo === GRUPO.USUARIO;
}

export function podeGerenciarUsuarios(grupo: string | null | undefined): boolean {
  return ehAdministrativo(grupo);
}

export function podeVerTodosPrazos(grupo: string | null | undefined): boolean {
  return ehAdministrativo(grupo) || ehGestor(grupo);
}
