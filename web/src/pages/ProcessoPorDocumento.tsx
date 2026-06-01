import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { DocumentoCaptura } from "@/components/DocumentoCaptura";
import { FormularioCadastroProcesso } from "@/components/FormularioCadastroProcesso";
import {
  confirmarProcessoPorDocumento,
  extrairProcessoPorDocumento,
  prepararProcessoDePublicacao,
  MODELOS_IA,
  type PrepararProcessoResponse,
  type ProcessoFormConfirmar,
  type ProvedorIa,
} from "@/lib/api";

export function ProcessoPorDocumento() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const publicacaoIdParam = searchParams.get("publicacaoId");
  const publicacaoId = publicacaoIdParam ? parseInt(publicacaoIdParam, 10) : undefined;

  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProvedorIa>("openai");
  const [model, setModel] = useState<string>(MODELOS_IA.openai[0].value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preparado, setPreparado] = useState<PrepararProcessoResponse | null>(null);

  useEffect(() => {
    if (!publicacaoId || !Number.isFinite(publicacaoId)) return;
    setLoading(true);
    prepararProcessoDePublicacao(publicacaoId)
      .then((data) => setPreparado(data))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Erro ao carregar publicação.")
      )
      .finally(() => setLoading(false));
  }, [publicacaoId]);

  const handleProviderChange = (p: ProvedorIa) => {
    setProvider(p);
    setModel(MODELOS_IA[p][0].value);
  };

  const handleExtrair = async () => {
    if (!imageBase64) {
      setError("Envie uma imagem ou PDF primeiro.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await extrairProcessoPorDocumento(imageBase64, { provider, model });
      setPreparado(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao extrair dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmar = async (body: ProcessoFormConfirmar) => {
    setError("");
    setLoading(true);
    try {
      const res = await confirmarProcessoPorDocumento({
        ...body,
        publicacaoId: publicacaoId ?? body.publicacaoId,
      });
      navigate(`/processos/${res.processoId}`, {
        replace: true,
        state: { message: res.message },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar.");
    } finally {
      setLoading(false);
    }
  };

  const mostrarUpload = !preparado && !publicacaoId;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to="/processos" className="text-sm text-primary hover:underline">
          ← Processos
        </Link>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          {publicacaoId ? "Vincular processo e cliente" : "Novo processo por documento"}
        </h2>
        <p className="mt-1 text-muted-foreground">
          Fluxo completo: cliente na base (ou novo) → processo → publicações e prazos do mesmo CNJ.
          Revise os dados extraídos antes de confirmar.
        </p>
      </div>

      {mostrarUpload && (
        <>
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
              onClick={() => void handleExtrair()}
              disabled={loading}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Extraindo…" : "Extrair dados com IA"}
            </button>
          )}
        </>
      )}

      {loading && !preparado && publicacaoId && (
        <p className="text-sm text-muted-foreground">Carregando dados da publicação…</p>
      )}

      {preparado && (
        <FormularioCadastroProcesso
          preparado={preparado}
          publicacaoId={publicacaoId}
          onConfirmar={(body) => void handleConfirmar(body)}
          loading={loading}
        />
      )}

      {preparado && mostrarUpload === false && imageBase64 && (
        <button
          type="button"
          onClick={() => {
            setPreparado(null);
            setImageBase64(null);
          }}
          className="text-sm text-muted-foreground underline"
        >
          Enviar outro documento
        </button>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
