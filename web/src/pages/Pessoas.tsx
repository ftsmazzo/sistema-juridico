import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPessoas,
  createPessoa,
  updatePessoa,
  type PessoaListItem,
} from "@/lib/api";

const TIPOS = [
  { value: "colaborador", label: "Colaborador" },
  { value: "advogado", label: "Advogado" },
  { value: "cliente", label: "Cliente" },
];

export function Pessoas() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PessoaListItem | null>(null);

  const { data: list = [], isPending } = useQuery({
    queryKey: ["pessoas", q],
    queryFn: () => getPessoas({ q: q || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: createPessoa,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pessoas"] });
      setModalOpen(false);
      setEditing(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Parameters<typeof updatePessoa>[1] }) =>
      updatePessoa(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pessoas"] });
      setModalOpen(false);
      setEditing(null);
    },
  });

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(p: PessoaListItem) {
    setEditing(p);
    setModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Pessoas</h1>
        <div className="flex gap-2">
          <input
            type="search"
            placeholder="Buscar por nome..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={openNew}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Nova pessoa
          </button>
        </div>
      </div>

      {isPending ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="p-3 font-medium">Nome</th>
                <th className="p-3 font-medium">E-mail</th>
                <th className="p-3 font-medium">Tipo</th>
                <th className="p-3 font-medium">OAB</th>
                <th className="p-3 font-medium">Ativo</th>
                <th className="p-3 font-medium w-20">Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="p-3">
                    {p.nome} {p.sobrenome}
                  </td>
                  <td className="p-3 text-muted-foreground">{p.email ?? "—"}</td>
                  <td className="p-3 capitalize">{p.tipo}</td>
                  <td className="p-3">{p.numeroOab ?? "—"}</td>
                  <td className="p-3">{p.ativo ? "Sim" : "Não"}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="text-primary hover:underline"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && (
            <p className="p-6 text-center text-muted-foreground">
              Nenhuma pessoa cadastrada.
            </p>
          )}
        </div>
      )}

      {modalOpen && (
        <PessoaModal
          pessoa={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSubmit={(body) => {
            if (editing) {
              updateMutation.mutate({ id: editing.id, body });
            } else {
              createMutation.mutate(body);
            }
          }}
          loading={createMutation.isPending || updateMutation.isPending}
          error={createMutation.error?.message ?? updateMutation.error?.message}
        />
      )}
    </div>
  );
}

function PessoaModal({
  pessoa,
  onClose,
  onSubmit,
  loading,
  error,
}: {
  pessoa: PessoaListItem | null;
  onClose: () => void;
  onSubmit: (body: {
    nome: string;
    sobrenome: string;
    email?: string;
    celular?: string;
    tipo?: string;
    numeroOab?: string;
    ativo?: boolean;
  }) => void;
  loading: boolean;
  error?: string;
}) {
  const [nome, setNome] = useState(pessoa?.nome ?? "");
  const [sobrenome, setSobrenome] = useState(pessoa?.sobrenome ?? "");
  const [email, setEmail] = useState(pessoa?.email ?? "");
  const [celular, setCelular] = useState(pessoa?.celular ?? "");
  const [tipo, setTipo] = useState(pessoa?.tipo ?? "colaborador");
  const [numeroOab, setNumeroOab] = useState(pessoa?.numeroOab ?? "");
  const [ativo, setAtivo] = useState(pessoa?.ativo ?? true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !sobrenome.trim()) return;
    onSubmit({
      nome: nome.trim(),
      sobrenome: sobrenome.trim(),
      email: email.trim() || undefined,
      celular: celular.trim() || undefined,
      tipo,
      numeroOab: numeroOab.trim() || undefined,
      ...(pessoa ? { ativo } : {}),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">
          {pessoa ? "Editar pessoa" : "Nova pessoa"}
        </h2>
        {error && (
          <p className="mb-3 rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-1 w-full rounded border border-border px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Sobrenome</label>
              <input
                type="text"
                value={sobrenome}
                onChange={(e) => setSobrenome(e.target.value)}
                className="mt-1 w-full rounded border border-border px-3 py-2 text-sm"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Celular</label>
            <input
              type="text"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              className="mt-1 w-full rounded border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="mt-1 w-full rounded border border-border px-3 py-2 text-sm"
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          {tipo === "advogado" && (
            <div>
              <label className="block text-sm font-medium">Número OAB</label>
              <input
                type="text"
                value={numeroOab}
                onChange={(e) => setNumeroOab(e.target.value)}
                className="mt-1 w-full rounded border border-border px-3 py-2 text-sm"
              />
            </div>
          )}
          {pessoa && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
              />
              <span className="text-sm">Ativo</span>
            </label>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Salvando…" : pessoa ? "Salvar" : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
