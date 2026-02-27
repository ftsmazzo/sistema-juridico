import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUsuarios,
  getUsuario,
  createUsuario,
  updateUsuario,
  type UsuarioListItem,
  type UsuarioComPessoa,
} from "@/lib/api";

const PERFIS = [
  { value: "consultivo", label: "Consultivo" },
  { value: "administrativo", label: "Administrativo" },
  { value: "advogado", label: "Advogado" },
  { value: "gestor", label: "Gestor" },
];

const TIPOS_PESSOA = [
  { value: "colaborador", label: "Colaborador" },
  { value: "advogado", label: "Advogado" },
  { value: "cliente", label: "Cliente" },
];

export function Usuarios() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: list = [], isPending } = useQuery({
    queryKey: ["usuarios", q],
    queryFn: () => getUsuarios({ q: q || undefined }),
  });

  const { data: usuarioFull, isPending: loadingEdit } = useQuery({
    queryKey: ["usuario", editingId],
    queryFn: () => getUsuario(editingId!),
    enabled: modalOpen && editingId != null,
  });

  const createMutation = useMutation({
    mutationFn: createUsuario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setModalOpen(false);
      setEditingId(null);
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
      setEditingId(null);
    },
  });

  function openNew() {
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(u: UsuarioListItem) {
    setEditingId(u.id);
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
                <th className="p-3 font-medium">Nome</th>
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
          usuarioFull={editingId != null ? usuarioFull ?? null : null}
          loadingEdit={loadingEdit && editingId != null}
          onClose={() => {
            setModalOpen(false);
            setEditingId(null);
          }}
          onSubmit={(body) => {
            if (editingId != null) {
              updateMutation.mutate({
                id: editingId,
                body: {
                  nome: body.nome,
                  sobrenome: body.sobrenome,
                  email: body.email,
                  celular: body.celular,
                  tipo: body.tipo,
                  numeroOab: body.numeroOab,
                  perfil: body.perfil,
                  ativo: body.ativo,
                  senha: body.senha,
                },
              });
            } else {
              createMutation.mutate({
                nome: body.nome!,
                sobrenome: body.sobrenome!,
                email: body.email,
                celular: body.celular,
                tipo: body.tipo,
                numeroOab: body.numeroOab,
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

type FormBody = {
  nome?: string;
  sobrenome?: string;
  email?: string;
  celular?: string;
  tipo?: string;
  numeroOab?: string;
  login?: string;
  senha?: string;
  perfil?: string;
  ativo?: boolean;
};

function UsuarioModal({
  usuarioFull,
  loadingEdit,
  onClose,
  onSubmit,
  loading,
  error,
}: {
  usuarioFull: UsuarioComPessoa | null;
  loadingEdit: boolean;
  onClose: () => void;
  onSubmit: (body: FormBody) => void;
  loading: boolean;
  error?: string;
}) {
  const isEdit = usuarioFull != null;

  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [email, setEmail] = useState("");
  const [celular, setCelular] = useState("");
  const [tipo, setTipo] = useState("colaborador");
  const [numeroOab, setNumeroOab] = useState("");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [perfil, setPerfil] = useState("advogado");
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    if (!usuarioFull) {
      if (!isEdit) {
        setNome("");
        setSobrenome("");
        setEmail("");
        setCelular("");
        setTipo("colaborador");
        setNumeroOab("");
        setLogin("");
        setSenha("");
        setPerfil("advogado");
        setAtivo(true);
      }
      return;
    }
    const pessoa = usuarioFull.pessoa;
    setNome(pessoa?.nome ?? "");
    setSobrenome(pessoa?.sobrenome ?? "");
    setEmail(pessoa?.email ?? "");
    setCelular(pessoa?.celular ?? "");
    setTipo(pessoa?.tipo ?? "colaborador");
    setNumeroOab(pessoa?.numeroOab ?? "");
    setLogin(usuarioFull.login);
    setSenha("");
    setPerfil(usuarioFull.perfil);
    setAtivo(usuarioFull.ativo);
  }, [usuarioFull, isEdit]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isEdit) {
      onSubmit({
        nome: nome.trim(),
        sobrenome: sobrenome.trim(),
        email: email.trim() || undefined,
        celular: celular.trim() || undefined,
        tipo: tipo || undefined,
        numeroOab: numeroOab.trim() || undefined,
        perfil,
        ativo,
        senha: senha.trim() || undefined,
      });
    } else {
      if (!nome.trim() || !sobrenome.trim() || !login.trim() || !senha) return;
      onSubmit({
        nome: nome.trim(),
        sobrenome: sobrenome.trim(),
        email: email.trim() || undefined,
        celular: celular.trim() || undefined,
        tipo: tipo || undefined,
        numeroOab: numeroOab.trim() || undefined,
        login: login.trim(),
        senha,
        perfil,
      });
    }
  }

  const canSubmit = isEdit
    ? nome.trim() && sobrenome.trim()
    : nome.trim() && sobrenome.trim() && login.trim() && senha;

  if (loadingEdit) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="rounded-lg border border-border bg-card px-8 py-6 text-sm text-muted-foreground">
          Carregando…
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-lg my-8">
        <h2 className="mb-4 text-lg font-semibold">
          {isEdit ? "Editar usuário" : "Novo usuário"}
        </h2>
        {error && (
          <p className="mb-3 rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset className="space-y-3 rounded border border-border p-3">
            <legend className="text-sm font-medium text-foreground">
              Dados da pessoa
            </legend>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">Tipo</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="mt-1 w-full rounded border border-border px-3 py-2 text-sm"
                >
                  {TIPOS_PESSOA.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Nº OAB</label>
                <input
                  type="text"
                  value={numeroOab}
                  onChange={(e) => setNumeroOab(e.target.value)}
                  className="mt-1 w-full rounded border border-border px-3 py-2 text-sm"
                  placeholder="Opcional"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded border border-border p-3">
            <legend className="text-sm font-medium text-foreground">
              Acesso ao sistema
            </legend>
            {!isEdit && (
              <>
                <div>
                  <label className="block text-sm font-medium">Login</label>
                  <input
                    type="text"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    className="mt-1 w-full rounded border border-border px-3 py-2 text-sm"
                    required={!isEdit}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Senha</label>
                  <input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="mt-1 w-full rounded border border-border px-3 py-2 text-sm"
                    required={!isEdit}
                  />
                </div>
              </>
            )}
            {isEdit && (
              <div>
                <label className="block text-sm font-medium">Login</label>
                <p className="mt-1 text-sm text-muted-foreground">{login}</p>
              </div>
            )}
            {isEdit && (
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
            {isEdit && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                />
                <span className="text-sm">Ativo</span>
              </label>
            )}
          </fieldset>

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
              disabled={loading || !canSubmit}
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Salvando…" : isEdit ? "Salvar" : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
