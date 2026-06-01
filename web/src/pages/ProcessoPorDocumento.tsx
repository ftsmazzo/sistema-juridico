import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DocumentoCaptura } from "@/components/DocumentoCaptura";
import {
  cadastrarProcessoPorDocumento,
  MODELOS_IA,
  type ProvedorIa,
} from "@/lib/api";

export function ProcessoPorDocumento() {
  const navigate = useNavigate();
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProvedorIa>("openai");
  const [model, setModel] = useState<string>(MODELOS_IA.openai[0].value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultMessage, setResultMessage] = useState("");

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
    setResultMessage("");
    setLoading(true);
    try {
      const res = await cadastrarProcessoPorDocumento(imageBase64, { provider, model });
      setResultMessage(res.message);
      navigate(`/processos/${res.processoId}`, {
        replace: true,
        state: { message: res.message },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar processo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link to="/processos" className="text-sm text-primary hover:underline">
          ← Processos
        </Link>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Novo processo por documento
        </h2>
        <p className="mt-1 text-muted-foreground">
          Envie print, foto ou PDF da capa, petição inicial ou publicação. A IA extrai número CNJ,
          vara, partes e demais dados básicos. Publicações já cadastradas com o mesmo número são
          vinculadas automaticamente.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <p className="mb-2 text-sm font-medium text-foreground">Extração por IA</p>
        <div className="flex flex-wrap gap-3">
          <select
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value as ProvedorIa)}
            className="rounded border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="openai">OpenAI (GPT)</option>
            <option value="claude">Claude</option>
          </select>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="rounded border border-border bg-background px-3 py-2 text-sm"
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
      />

      {imageBase64 && (
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Extraindo e cadastrando…" : "Extrair e cadastrar processo"}
        </button>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {resultMessage && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-sm">
          {resultMessage}
        </div>
      )}
    </div>
  );
}
