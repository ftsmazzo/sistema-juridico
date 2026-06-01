/** Versão alinhada ao worker servido pelo CDN (sem dependência npm no build). */
const PDFJS_VERSION = "4.10.38";
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (params: { data: ArrayBuffer }) => { promise: Promise<PdfDocument> };
};

type PdfDocument = {
  numPages: number;
  getPage: (n: number) => Promise<PdfPage>;
};

type PdfPage = {
  getViewport: (p: { scale: number }) => { width: number; height: number };
  render: (p: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }) => { promise: Promise<void> };
};

let pdfjsLoadPromise: Promise<PdfJsLib> | null = null;

function loadPdfJs(): Promise<PdfJsLib> {
  if (pdfjsLoadPromise) return pdfjsLoadPromise;

  pdfjsLoadPromise = new Promise((resolve, reject) => {
    const w = window as Window & { pdfjsLib?: PdfJsLib };
    if (w.pdfjsLib) {
      w.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.mjs`;
      resolve(w.pdfjsLib);
      return;
    }

    const script = document.createElement("script");
    script.type = "module";
    script.textContent = `
      import * as pdfjsLib from "${PDFJS_CDN}/pdf.min.mjs";
      pdfjsLib.GlobalWorkerOptions.workerSrc = "${PDFJS_CDN}/pdf.worker.min.mjs";
      window.pdfjsLib = pdfjsLib;
      window.dispatchEvent(new Event("pdfjs-ready"));
    `;
    script.onerror = () => reject(new Error("Falha ao carregar biblioteca PDF."));
    window.addEventListener(
      "pdfjs-ready",
      () => {
        if (w.pdfjsLib) resolve(w.pdfjsLib);
        else reject(new Error("PDF.js não inicializou."));
      },
      { once: true }
    );
    document.head.appendChild(script);
  });

  return pdfjsLoadPromise;
}

/** Converte páginas de um PDF em data URLs JPEG (para envio à API de visão). */
export async function pdfFileToDataUrls(
  file: File,
  maxPages = 2
): Promise<string[]> {
  const pdfjs = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const total = Math.min(pdf.numPages, maxPages);
  const urls: string[] = [];

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    await page.render({ canvasContext: ctx, viewport }).promise;
    urls.push(canvas.toDataURL("image/jpeg", 0.9));
  }
  return urls;
}
