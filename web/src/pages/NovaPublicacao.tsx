import { Link } from "react-router-dom";

export function NovaPublicacao() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Nova publicação
        </h2>
        <p className="text-muted-foreground">
          Incluir publicação a partir de imagem (print de tela) com extração por IA.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-muted-foreground">
          Em breve: você poderá enviar um <strong>print de tela</strong> (ou imagem) da publicação.
          O sistema fará a <strong>extração dos dados com IA</strong>, gravará no banco e executará
          o mesmo processo de análise (movimentações, prazos) dentro do próprio sistema.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Sem preenchimento manual — tudo a partir da imagem.
        </p>
        <Link
          to="/publicacoes"
          className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
        >
          ← Voltar para Publicações
        </Link>
      </div>
    </div>
  );
}
