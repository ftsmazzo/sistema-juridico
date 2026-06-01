import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DocumentoCaptura } from "@/components/DocumentoCaptura";
import {
  cadastrarPublicacaoPorPrint,
  MODELOS_IA,
  type ProvedorIa,
} from "@/lib/api";

export function NovaPublicacao() {
  const navigate = useNavigate();
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProvedorIa>("openai");
  const [model, setModel] = useState<string>(MODELOS_IA.openai[0].value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleProviderChange = (p: ProvedorIa) => {
    setProvider(p);
    setModel(MODELOS_IA[p][0].value);
  };

  const handleSubmit = async () => {
    if (!imageBase64) {
      setError("Envie uma imagem ou PDF primeiro.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await cadastrarPublicacaoPorPrint(imageBase64, {
        provider,
        model,
      });
      const ids = res.publicacaoIds ?? (res.publicacaoId != null ? [res.publicacaoId] : []);
      if (ids.length === 1) {
        navigate(`/publicacoes/${ids[0]}`, {
          replace: true,
          state: { message: res.message },
        });
      } else {
        navigate("/publicacoes", {
          replace: true,
          state: { message: res.message },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar publicação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Nova publicação por documento
        </h2>
        <p className="mt-1 text-muted-foreground">
          Imagem ou PDF do recorte/publicação. A IA extrai os dados, cria prazos e, se o processo
          ainda não existir no cadastro, cria um registro mínimo automaticamente.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <p className="mb-2 text-sm font-medium text-foreground">
          Extração por IA (escolha antes de enviar)
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value as ProvedorIa)}
            className="rounded border border-border bg-background px-3 py-2 text-sm"
            aria-label="Provedor de IA"
          >
            <option value="openai">OpenAI (GPT)</option>
            <option value="claude">Claude (Anthropic)</option>
          </select>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="rounded border border-border bg-background px-3 py-2 text-sm"
            aria-label="Modelo"
          >
            {MODELOS_IA[provider].map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DocumentoCaptura
        onImageReady={setImageBase64}
        onError={setError}
        disabled={loading}
        label="Print, foto ou PDF da publicação"
      />

      {imageBase64 && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={loading}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Extraindo e cadastrando…" : "Extrair e cadastrar"}
          </button>
          <button
            type="button"
            onClick={() => setImageBase64(null)}
            disabled={loading}
            className="rounded border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            Cancelar
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        <Link to="/publicacoes" className="underline hover:text-foreground">
          ← Voltar para Publicações
        </Link>
      </p>
    </div>
  );
}
