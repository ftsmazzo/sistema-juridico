import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPublicacao,
  updatePublicacao,
  type PublicacaoDetalhe,
} from "@/lib/api";

function formatarData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Campo({
  label,
  valor,
  editando,
  nome,
  tipo = "text",
  placeholder,
  value,
  onChange,
}: {
  label: string;
  valor: string | null;
  editando: boolean;
  nome?: string;
  tipo?: string;
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  if (!editando) {
    return (
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm text-foreground">{valor ?? "—"}</p>
      </div>
    );
  }
  const isTextarea = tipo === "textarea";
  const Input = isTextarea ? "textarea" : "input";
  return (
    <div>
      <label htmlFor={nome} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <Input
        id={nome}
        name={nome}
        type={tipo}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        rows={isTextarea ? 3 : undefined}
      />
    </div>
  );
}

export function DetalhePublicacao() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<Partial<PublicacaoDetalhe>>({});

  const pubId = id ? parseInt(id, 10) : NaN;
  const { data: pub, isPending, isError } = useQuery({
    queryKey: ["publicacao", pubId],
    queryFn: () => getPublicacao(pubId),
    enabled: Number.isFinite(pubId),
  });

  const mutation = useMutation({
    mutationFn: (body: Partial<PublicacaoDetalhe>) => updatePublicacao(pubId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publicacao", pubId] });
      queryClient.invalidateQueries({ queryKey: ["publicacoes"] });
      setEditando(false);
      setForm({});
    },
  });

  const handleSave = () => {
    mutation.mutate(form);
  };

  const openEdit = () => {
    setForm({
      numeroProcesso: pub?.numeroProcesso ?? null,
      tipoPublicacao: pub?.tipoPublicacao ?? null,
      vara: pub?.vara ?? null,
      dataPublicacao: pub?.dataPublicacao ?? null,
      dataDisponibilizacao: pub?.dataDisponibilizacao ?? null,
      resumo: pub?.resumo ?? null,
      observacoesIa: pub?.observacoesIa ?? null,
      textoCompleto: pub?.textoCompleto ?? null,
      baseLegal: pub?.baseLegal ?? null,
      prazoDiasUteisSugerido: pub?.prazoDiasUteisSugerido ?? null,
      urlDocumento: pub?.urlDocumento ?? null,
      identificadorDocumento: pub?.identificadorDocumento ?? null,
      advogadoPrincipal: pub?.advogadoPrincipal ?? null,
      numeroOab: pub?.numeroOab ?? null,
      poloAtivo: pub?.poloAtivo ?? null,
      valorMencionado: pub?.valorMencionado ?? null,
      jornal: pub?.jornal ?? null,
      pagina: pub?.pagina ?? null,
      caderno: pub?.caderno ?? null,
      local: pub?.local ?? null,
    });
    setEditando(true);
  };

  if (!Number.isFinite(pubId)) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">ID inválido.</p>
        <Link to="/publicacoes" className="text-primary underline">← Voltar</Link>
      </div>
    );
  }

  if (isError || (!isPending && !pub)) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">Publicação não encontrada.</p>
        <Link to="/publicacoes" className="text-primary underline">← Voltar</Link>
      </div>
    );
  }

  if (isPending && !pub) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Carregando…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/publicacoes" className="text-sm text-primary hover:underline">
            ← Publicações
          </Link>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Publicação #{pub.id}
          </h2>
          <p className="text-muted-foreground">
            {pub.numeroProcesso || "Sem número de processo"} · {pub.tipoPublicacao || "—"}
          </p>
        </div>
        {!editando ? (
          <button
            type="button"
            onClick={openEdit}
            className="shrink-0 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Editar
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setEditando(false); setForm({}); }}
              className="shrink-0 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={mutation.isPending}
              className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {mutation.isPending ? "Salvando…" : "Salvar"}
            </button>
          </div>
        )}
      </div>

      {mutation.isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
          {mutation.error instanceof Error ? mutation.error.message : "Erro ao salvar."}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-foreground">Identificação</h3>
          <div className="space-y-4">
            <Campo
              label="Número do processo"
              valor={editando ? null : (pub.numeroProcesso ?? null)}
              editando={editando}
              nome="numeroProcesso"
              value={editando ? (form.numeroProcesso ?? "") : undefined}
              onChange={(v) => setForm((f) => ({ ...f, numeroProcesso: v || null }))}
            />
            <Campo
              label="Tipo de publicação"
              valor={editando ? null : (pub.tipoPublicacao ?? null)}
              editando={editando}
              nome="tipoPublicacao"
              value={editando ? (form.tipoPublicacao ?? "") : undefined}
              onChange={(v) => setForm((f) => ({ ...f, tipoPublicacao: v || null }))}
            />
            <Campo
              label="Vara"
              valor={editando ? null : (pub.vara ?? null)}
              editando={editando}
              nome="vara"
              value={editando ? (form.vara ?? "") : undefined}
              onChange={(v) => setForm((f) => ({ ...f, vara: v || null }))}
            />
            <Campo
              label="Data da publicação"
              valor={pub.dataPublicacao ?? null}
              editando={editando}
              nome="dataPublicacao"
              value={editando ? (form.dataPublicacao ?? "") : undefined}
              onChange={(v) => setForm((f) => ({ ...f, dataPublicacao: v || null }))}
            />
            <Campo
              label="Data disponibilização"
              valor={pub.dataDisponibilizacao ?? null}
              editando={editando}
              nome="dataDisponibilizacao"
              value={editando ? (form.dataDisponibilizacao ?? "") : undefined}
              onChange={(v) => setForm((f) => ({ ...f, dataDisponibilizacao: v || null }))}
            />
            <Campo label="E-mail (origem)" valor={pub.emailId} editando={false} />
            <Campo label="Registro em" valor={formatarData(pub.createdAt)} editando={false} />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-foreground">Conteúdo e análise</h3>
          <div className="space-y-4">
            <Campo
              label="Resumo"
              valor={editando ? null : (pub.resumo ?? null)}
              editando={editando}
              nome="resumo"
              tipo="textarea"
              value={editando ? (form.resumo ?? "") : undefined}
              onChange={(v) => setForm((f) => ({ ...f, resumo: v || null }))}
            />
            <Campo
              label="Observações da IA"
              valor={editando ? null : (pub.observacoesIa ?? null)}
              editando={editando}
              nome="observacoesIa"
              tipo="textarea"
              value={editando ? (form.observacoesIa ?? "") : undefined}
              onChange={(v) => setForm((f) => ({ ...f, observacoesIa: v || null }))}
            />
            <Campo
              label="Base legal"
              valor={editando ? null : (pub.baseLegal ?? null)}
              editando={editando}
              nome="baseLegal"
              value={editando ? (form.baseLegal ?? "") : undefined}
              onChange={(v) => setForm((f) => ({ ...f, baseLegal: v || null }))}
            />
            <Campo
              label="Prazo (dias úteis sugerido)"
              valor={pub.prazoDiasUteisSugerido != null ? String(pub.prazoDiasUteisSugerido) : null}
              editando={editando}
              nome="prazoDiasUteisSugerido"
              tipo="number"
              value={
                editando
                  ? (form.prazoDiasUteisSugerido != null
                      ? String(form.prazoDiasUteisSugerido)
                      : "")
                  : undefined
              }
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  prazoDiasUteisSugerido: v === "" ? null : parseInt(v, 10) || null,
                }))
              }
            />
            <Campo
              label="URL do documento"
              valor={pub.urlDocumento ?? null}
              editando={editando}
              nome="urlDocumento"
              value={editando ? (form.urlDocumento ?? "") : undefined}
              onChange={(v) => setForm((f) => ({ ...f, urlDocumento: v || null }))}
            />
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-foreground">Texto completo</h3>
        {editando ? (
          <Campo
            label=""
            valor={null}
            editando={true}
            nome="textoCompleto"
            tipo="textarea"
            value={form.textoCompleto ?? ""}
            onChange={(v) => setForm((f) => ({ ...f, textoCompleto: v || null }))}
          />
        ) : (
          <pre className="max-h-60 overflow-auto whitespace-pre-wrap rounded border border-border/60 bg-muted/20 p-3 text-xs text-foreground">
            {pub.textoCompleto || "—"}
          </pre>
        )}
      </section>
    </div>
  );
}
