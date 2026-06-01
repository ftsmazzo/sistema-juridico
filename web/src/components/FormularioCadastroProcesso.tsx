import { useEffect, useState } from "react";
import { getClientes, type PrepararProcessoResponse, type ProcessoFormConfirmar } from "@/lib/api";

type Props = {
  preparado: PrepararProcessoResponse;
  publicacaoId?: number;
  onConfirmar: (body: ProcessoFormConfirmar) => void;
  loading?: boolean;
};

export function FormularioCadastroProcesso({
  preparado,
  publicacaoId,
  onConfirmar,
  loading,
}: Props) {
  const p = preparado.processo;
  const c0 = preparado.cliente;
  const sugestaoTop = preparado.clientesSugeridos[0];

  const [modoCliente, setModoCliente] = useState<"existente" | "novo">(
    sugestaoTop && sugestaoTop.score >= 75 ? "existente" : "novo"
  );
  const [idCliente, setIdCliente] = useState<number | "">(
    sugestaoTop && sugestaoTop.score >= 75 ? sugestaoTop.id : ""
  );
  const [buscaCliente, setBuscaCliente] = useState("");
  const [listaBusca, setListaBusca] = useState(preparado.clientesSugeridos);

  const [tipoCliente, setTipoCliente] = useState<"PF" | "PJ">(
    (c0.tipoSugerido as "PF" | "PJ") || "PF"
  );
  const [nomeCliente, setNomeCliente] = useState(c0.nome ?? "");
  const [razaoSocial, setRazaoSocial] = useState(c0.razaoSocial ?? "");
  const [cpf, setCpf] = useState(c0.cpf ?? "");
  const [cnpj, setCnpj] = useState(c0.cnpj ?? "");

  const [numeroCnj, setNumeroCnj] = useState(p.numeroCnj ?? "");
  const [vara, setVara] = useState(p.vara ?? "");
  const [comarca, setComarca] = useState(p.comarca ?? "");
  const [instancia, setInstancia] = useState(p.instancia ?? "");
  const [tipoAcao, setTipoAcao] = useState(p.tipoAcao ?? "");
  const [qualificacaoCliente, setQualificacaoCliente] = useState(
    c0.qualificacaoCliente ?? p.qualificacaoCliente ?? ""
  );
  const [outroEnvolvido, setOutroEnvolvido] = useState(p.outroEnvolvido ?? "");
  const [qualificacaoOutro, setQualificacaoOutro] = useState(p.qualificacaoOutro ?? "");
  const [valorCausa, setValorCausa] = useState(p.valorCausa ?? "");
  const [observacoes, setObservacoes] = useState(p.observacoes ?? "");

  useEffect(() => {
    if (buscaCliente.trim().length < 2) {
      setListaBusca(preparado.clientesSugeridos);
      return;
    }
    const t = setTimeout(() => {
      getClientes({ q: buscaCliente.trim() })
        .then((list) =>
          setListaBusca(
            list.map((x) => ({
              id: x.id,
              tipo: x.tipo,
              nome: x.nome,
              razaoSocial: x.razaoSocial,
              cpf: x.cpf,
              cnpj: x.cnpj,
              score: 0,
              motivo: "Busca manual",
            }))
          )
        )
        .catch(() => setListaBusca([]));
    }, 300);
    return () => clearTimeout(t);
  }, [buscaCliente, preparado.clientesSugeridos]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroCnj.trim()) return;

    const cliente =
      modoCliente === "existente" && idCliente !== ""
        ? { modo: "existente" as const, idCliente: Number(idCliente) }
        : {
            modo: "novo" as const,
            tipo: tipoCliente,
            nome: nomeCliente.trim(),
            razaoSocial: razaoSocial.trim() || null,
            cpf: cpf.trim() || null,
            cnpj: cnpj.trim() || null,
          };

    onConfirmar({
      numeroCnj: numeroCnj.trim(),
      status: p.status ?? "Ativo",
      vara: vara.trim() || null,
      comarca: comarca.trim() || null,
      instancia: instancia.trim() || null,
      tipoAcao: tipoAcao.trim() || null,
      qualificacaoCliente: qualificacaoCliente.trim() || null,
      outroEnvolvido: outroEnvolvido.trim() || null,
      qualificacaoOutro: qualificacaoOutro.trim() || null,
      valorCausa: valorCausa.trim() || null,
      observacoes: observacoes.trim() || null,
      cliente,
      publicacaoId,
    });
  };

  const faltando = preparado.camposObrigatoriosFaltando;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {preparado.processoExistenteId && (
        <div className="rounded-lg border border-amber-600/30 bg-amber-500/10 px-4 py-3 text-sm">
          Já existe processo com este CNJ (ID {preparado.processoExistenteId}). Ao confirmar, os
          dados serão atualizados e publicações vinculadas.
        </div>
      )}
      {faltando.length > 0 && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          A IA não identificou todos os campos ({faltando.join(", ")}). Complete abaixo antes de
          cadastrar.
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-foreground">Processo</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Número CNJ *" value={numeroCnj} onChange={setNumeroCnj} required />
          <Field label="Tipo de ação" value={tipoAcao} onChange={setTipoAcao} />
          <Field label="Vara" value={vara} onChange={setVara} />
          <Field label="Comarca" value={comarca} onChange={setComarca} />
          <Field label="Instância" value={instancia} onChange={setInstancia} />
          <Field label="Valor da causa" value={valorCausa} onChange={setValorCausa} />
          <Field label="Qualificação do cliente" value={qualificacaoCliente} onChange={setQualificacaoCliente} />
          <Field label="Parte contrária" value={outroEnvolvido} onChange={setOutroEnvolvido} />
          <Field label="Qualificação da contrária" value={qualificacaoOutro} onChange={setQualificacaoOutro} />
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Observações</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-foreground">Cliente</h3>
        <div className="mb-4 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={modoCliente === "existente"}
              onChange={() => setModoCliente("existente")}
            />
            Cliente já cadastrado
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={modoCliente === "novo"}
              onChange={() => setModoCliente("novo")}
            />
            Cadastrar novo cliente
          </label>
        </div>

        {modoCliente === "existente" ? (
          <div className="space-y-3">
            <input
              type="search"
              placeholder="Buscar por nome, CPF ou CNPJ…"
              value={buscaCliente}
              onChange={(e) => setBuscaCliente(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <ul className="max-h-48 space-y-1 overflow-auto rounded-md border border-border p-2">
              {listaBusca.length === 0 ? (
                <li className="text-sm text-muted-foreground">Nenhum cliente encontrado.</li>
              ) : (
                listaBusca.map((c) => (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 hover:bg-muted">
                      <input
                        type="radio"
                        name="idCliente"
                        checked={idCliente === c.id}
                        onChange={() => setIdCliente(c.id)}
                      />
                      <span className="text-sm">
                        <strong>{c.nome}</strong>
                        {c.razaoSocial ? ` — ${c.razaoSocial}` : ""}
                        <span className="block text-xs text-muted-foreground">
                          {c.tipo}
                          {c.cpf ? ` · CPF ${c.cpf}` : ""}
                          {c.cnpj ? ` · CNPJ ${c.cnpj}` : ""}
                          {c.score > 0 ? ` · ${c.motivo}` : ""}
                        </span>
                      </span>
                    </label>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <select
                value={tipoCliente}
                onChange={(e) => setTipoCliente(e.target.value as "PF" | "PJ")}
                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="PF">Pessoa física</option>
                <option value="PJ">Pessoa jurídica</option>
              </select>
            </div>
            <Field
              label={tipoCliente === "PJ" ? "Nome fantasia *" : "Nome completo *"}
              value={nomeCliente}
              onChange={setNomeCliente}
              required
            />
            {tipoCliente === "PJ" && (
              <Field label="Razão social" value={razaoSocial} onChange={setRazaoSocial} />
            )}
            {tipoCliente === "PF" ? (
              <Field label="CPF" value={cpf} onChange={setCpf} />
            ) : (
              <Field label="CNPJ" value={cnpj} onChange={setCnpj} />
            )}
          </div>
        )}
      </section>

      <button
        type="submit"
        disabled={
          loading ||
          !numeroCnj.trim() ||
          (modoCliente === "existente" && idCliente === "") ||
          (modoCliente === "novo" && !nomeCliente.trim())
        }
        className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Salvando…" : "Cadastrar processo e vincular"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
    </div>
  );
}
