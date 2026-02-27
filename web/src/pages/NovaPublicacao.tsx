import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  cadastrarPublicacaoPorPrint,
  MODELOS_IA,
  type ProvedorIa,
} from "@/lib/api";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("Leitura do arquivo falhou"));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function NovaPublicacao() {
  const navigate = useNavigate();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProvedorIa>("openai");
  const [model, setModel] = useState<string>(MODELOS_IA.openai[0].value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const setImage = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Selecione um arquivo de imagem (PNG, JPG, etc.).");
      return;
    }
    setError("");
    setImagePreview(URL.createObjectURL(file));
    fileToBase64(file).then(setImageBase64).catch(() => {
      setError("Falha ao ler a imagem.");
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) setImage(file);
    },
    [setImage]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) setImage(file);
      e.target.value = "";
    },
    [setImage]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const item = e.clipboardData?.items?.[0];
      if (item?.kind === "file") {
        const file = item.getAsFile();
        if (file) setImage(file);
      }
    },
    [setImage]
  );

  const handleProviderChange = (p: ProvedorIa) => {
    setProvider(p);
    setModel(MODELOS_IA[p][0].value);
  };

  const handleSubmit = async () => {
    if (!imageBase64) {
      setError("Envie uma imagem primeiro (arraste, clique ou cole).");
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

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setImageBase64(null);
    setError("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Nova publicação por print
        </h2>
        <p className="mt-1 text-muted-foreground">
          Escolha a IA e o modelo abaixo, depois envie o print. A extração só roda ao clicar em &quot;Extrair e cadastrar&quot;.
          Se a imagem tiver várias publicações, todas são cadastradas.
        </p>
      </div>

      {/* Provedor e modelo sempre visíveis, antes de colar/arrastar */}
      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <p className="mb-2 text-sm font-medium text-foreground">
          Extração por IA (escolha antes de enviar a imagem)
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={provider}
            onChange={(e) =>
              handleProviderChange(e.target.value as ProvedorIa)
            }
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

      <div
        className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 transition-colors focus-within:border-primary/50 hover:border-primary/30"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onPaste={handlePaste}
        tabIndex={0}
      >
        {!imagePreview ? (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInput}
            />
            <span className="text-5xl text-muted-foreground">📷</span>
            <span className="font-medium text-foreground">
              Arraste a imagem aqui, clique para escolher ou cole (Ctrl+V)
            </span>
            <span className="text-sm text-muted-foreground">
              PNG, JPG ou WebP. Uma ou várias publicações na mesma imagem.
            </span>
          </label>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <img
                src={imagePreview}
                alt="Preview da publicação"
                className="max-h-80 rounded-lg border border-border object-contain"
              />
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={clearImage}
                  className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  Trocar imagem
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Extraindo e cadastrando…" : "Extrair e cadastrar"}
              </button>
              <button
                type="button"
                onClick={clearImage}
                className="rounded border border-border px-4 py-2 text-sm hover:bg-muted"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

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
