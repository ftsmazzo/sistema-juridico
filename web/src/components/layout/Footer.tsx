export function Footer() {
  const ano = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-card/80 px-6 py-4">
      <div className="flex flex-col items-center justify-between gap-2 text-center text-xs text-muted-foreground sm:flex-row">
        <p>
          Lourenço & Najm — Sociedade de Advogados
        </p>
        <p>
          © {ano} Todos os direitos reservados.
        </p>
        <p>
          Uso restrito a clientes e autorizados. As informações contidas no sistema são confidenciais.
        </p>
      </div>
    </footer>
  );
}
