import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUsuarios,
  getPessoas,
  createUsuario,
  updateUsuario,
  type UsuarioListItem,
} from "@/lib/api";

const PERFIS = [
  { value: "consultivo", label: "Consultivo" },
  { value: "administrativo", label: "Administrativo" },
  { value: "advogado", label: "Advogado" },
  { value: "gestor", label: "Gestor" },
];

export function Usuarios() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UsuarioListItem | null>(null);

  const { data: list = [], isPending } = useQuery({
    queryKey: ["usuarios", q],
    queryFn: () => getUsuarios({ q: q || undefined }),
  });

  const { data: pessoasList = [] } = useQuery({
    queryKey: ["pessoas"],
    queryFn: () => getPessoas({}),
  });

  const createMutation = useMutation({
    mutationFn: createUsuario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setModalOpen(false);
      setEditing(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: number;
      body: Parameters<typeof updateUsuario>[1];
    }) => updateUsuario(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setModalOpen(false);
      setEditing(null);
    },
  });

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(u: UsuarioListItem) {
    setEditing(u);
    setModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Usuários</h1>
        <div className="flex gap-2">
          <input
            type="search"
            placeholder="Buscar por login ou nome..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={openNew}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Novo usuário
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
                <th className="p-3 font-medium">Login</th>
                <th className="p-3 font-medium">Pessoa</th>
                <th className="p-3 font-medium">Perfil</th>
                <th className="p-3 font-medium">Ativo</th>
                <th className="p-3 font-medium w-20">Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-medium">{u.login}</td>
                  <td className="p-3 text-muted-foreground">
                    {u.pessoa
                      ? `${u.pessoa.nome} ${u.pessoa.sobrenome}`
                      : "—"}
                  </td>
                  <td className="p-3 capitalize">{u.perfil}</td>
                  <td className="p-3">{u.ativo ? "Sim" : "Não"}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => openEdit(u)}
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
              Nenhum usuário cadastrado.
            </p>
          )}
        </div>
      )}

      {modalOpen && (
        <UsuarioModal
          usuario={editing}
          pessoasList={pessoasList}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSubmit={(body) => {
            if (editing) {
              updateMutation.mutate({
                id: editing.id,
                body: {
                  idPessoa: body.idPessoa,
                  perfil: body.perfil,
                  ativo: body.ativo,
                  senha: body.senha,
                },
              });
            } else {
              createMutation.mutate({
                idPessoa: body.idPessoa ?? undefined,
                login: body.login!,
                senha: body.senha!,
                perfil: body.perfil,
              });
            }
          }}
          loading={createMutation.isPending || updateMutation.isPending}
          error={
            (createMutation.error as Error)?.message ??
            (updateMutation.error as Error)?.message
          }
        />
      )}
    </div>
  );
}

function UsuarioModal({
  usuario,
  pessoasList,
  onClose,
  onSubmit,
  loading,
  error,
}: {
  usuario: UsuarioListItem | null;
  pessoasList: { id: number; nome: string; sobrenome: string }[];
  onClose: () => void;
  onSubmit: (body: {
    idPessoa?: number | null;
    login?: string;
    senha?: string;
    perfil?: string;
    ativo?: boolean;
  }) => void;
  loading: boolean;
  error?: string;
}) {
  const [idPessoa, setIdPessoa] = useState<number | "">(
    usuario?.idPessoa ?? ""
  );
  const [login, setLogin] = useState(usuario?.login ?? "");
  const [senha, setSenha] = useState("");
  const [perfil, setPerfil] = useState(usuario?.perfil ?? "advogado");
  const [ativo, setAtivo] = useState(usuario?.ativo ?? true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (usuario) {
      onSubmit({
        idPessoa: idPessoa === "" ? null : idPessoa,
        perfil,
        ativo,
        senha: senha.trim() || undefined,
      });
    } else {
      if (!login.trim() || !senha) return;
      onSubmit({
        idPessoa: idPessoa === "" ? undefined : (idPessoa as number),
        login: login.trim(),
        senha,
        perfil,
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">
          {usuario ? "Editar usuário" : "Novo usuário"}
        </h2>
        {error && (
          <p className="mb-3 rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium">Pessoa</label>
            <select
              value={idPessoa}
              onChange={(e) =>
                setIdPessoa(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="mt-1 w-full rounded border border-border px-3 py-2 text-sm"
              disabled={!!usuario}
            >
              <option value="">— Sem vínculo —</option>
              {pessoasList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} {p.sobrenome}
                </option>
              ))}
            </select>
          </div>
          {!usuario && (
            <>
              <div>
                <label className="block text-sm font-medium">Login</label>
                <input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className="mt-1 w-full rounded border border-border px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Senha</label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="mt-1 w-full rounded border border-border px-3 py-2 text-sm"
                  required={!usuario}
                />
              </div>
            </>
          )}
          {usuario && (
            <div>
              <label className="block text-sm font-medium">
                Nova senha (deixe em branco para manter)
              </label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="mt-1 w-full rounded border border-border px-3 py-2 text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium">Perfil</label>
            <select
              value={perfil}
              onChange={(e) => setPerfil(e.target.value)}
              className="mt-1 w-full rounded border border-border px-3 py-2 text-sm"
            >
              {PERFIS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          {usuario && (
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
              disabled={loading || (!usuario && (!login.trim() || !senha))}
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Salvando…" : usuario ? "Salvar" : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
