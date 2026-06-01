import { useCallback, useState } from "react";
import { pdfFileToDataUrls } from "@/lib/pdfToImages";

export type DocumentoCapturaProps = {
  onImageReady: (dataUrl: string) => void;
  onError?: (msg: string) => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
};

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Leitura falhou"));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function DocumentoCaptura({
  onImageReady,
  onError,
  disabled,
  label = "Envie imagem ou PDF",
  hint = "PNG, JPG, WebP ou PDF (até 2 páginas). Arraste, clique ou cole (Ctrl+V).",
}: DocumentoCapturaProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      setLoading(true);
      try {
        if (file.type === "application/pdf") {
          const pages = await pdfFileToDataUrls(file, 2);
          if (!pages.length) {
            onError?.("Não foi possível ler o PDF.");
            return;
          }
          setPreview(pages[0]);
          onImageReady(pages[0]);
          return;
        }
        if (!file.type.startsWith("image/")) {
          onError?.("Use imagem (PNG, JPG) ou PDF.");
          return;
        }
        const dataUrl = await fileToDataUrl(file);
        setPreview(dataUrl);
        onImageReady(dataUrl);
      } catch {
        onError?.("Falha ao processar o arquivo.");
      } finally {
        setLoading(false);
      }
    },
    [onError, onImageReady]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) void processFile(file);
    },
    [processFile]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const item = e.clipboardData?.items?.[0];
      if (item?.kind === "file") {
        const file = item.getAsFile();
        if (file) void processFile(file);
      }
    },
    [processFile]
  );

  const clear = () => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(null);
  };

  return (
    <div
      className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 transition-colors focus-within:border-primary/50 hover:border-primary/30"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onPaste={handlePaste}
      tabIndex={0}
    >
      {!preview ? (
        <label
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 text-center ${disabled ? "pointer-events-none opacity-50" : ""}`}
        >
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void processFile(file);
              e.target.value = "";
            }}
          />
          <span className="text-4xl text-muted-foreground">📄</span>
          <span className="font-medium text-foreground">{label}</span>
          <span className="text-sm text-muted-foreground">{hint}</span>
          {loading && <span className="text-sm text-primary">Processando…</span>}
        </label>
      ) : (
        <div className="space-y-3">
          <img
            src={preview}
            alt="Preview"
            className="max-h-72 rounded-lg border border-border object-contain"
          />
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Trocar arquivo
          </button>
        </div>
      )}
    </div>
  );
}
