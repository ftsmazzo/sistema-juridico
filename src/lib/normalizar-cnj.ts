/** Remove tudo que não é dígito para comparar números CNJ. */
export function normalizarNumeroCnj(numero: string | null | undefined): string {
  if (!numero) return "";
  return numero.replace(/\D/g, "");
}

/** Formato exibível: mantém o original trimado ou só dígitos se vazio. */
export function formatarCnjParaGravar(numero: string): string {
  const t = numero.trim();
  return t || normalizarNumeroCnj(numero);
}
