/**
 * Importação da planilha LNSA (Excel): clientes (Clie-F, Clie-J), processos (Proc-G), movimentações (Proc-M).
 * Converte datas Excel (serial) para date. Casa cliente e advogado por nome.
 */
import * as XLSX from "xlsx";
import { db } from "../db/index.js";
import { clientes, processos, movimentacoesProcesso, usuarios } from "../db/schema.js";
import { eq, or, sql } from "drizzle-orm";

/** Converte número serial de data do Excel para string YYYY-MM-DD */
function excelSerialToDate(serial: number | undefined | null): string | null {
  if (serial == null || typeof serial !== "number" || isNaN(serial) || serial < 1) return null;
  const d = new Date(1899, 11, 30);
  d.setDate(d.getDate() + Math.floor(serial));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function str(v: unknown, max = 255): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s.slice(0, max) : null;
}

function row(arr: unknown[], i: number): unknown {
  return arr[i];
}

export type ResultadoImportacao = {
  clientesInseridos: number;
  processosInseridos: number;
  processosAtualizados: number;
  movimentacoesInseridas: number;
  erros: string[];
};

/** Importa planilha a partir de buffer (arquivo .xlsx) */
export async function importarPlanilhaProcessos(
  buffer: Buffer,
  opcoes: { importarClientes?: boolean; importarProcessos?: boolean; importarMovimentacoes?: boolean } = {}
): Promise<ResultadoImportacao> {
  const {
    importarClientes = true,
    importarProcessos = true,
    importarMovimentacoes = true,
  } = opcoes;

  const resultado: ResultadoImportacao = {
    clientesInseridos: 0,
    processosInseridos: 0,
    processosAtualizados: 0,
    movimentacoesInseridas: 0,
    erros: [],
  };

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  } catch (e) {
    resultado.erros.push("Arquivo Excel inválido ou corrompido.");
    return resultado;
  }

  const mapClienteNomeToId = new Map<string, number>();
  const mapProcessoOrdemToId = new Map<number, number>();
  const mapProcessoNumeroToId = new Map<string, number>();

  if (importarClientes) {
    // Clie-F: dados a partir da linha 5 (índice 4); linha 4 = cabeçalho
    const sheetF = wb.Sheets["Clie-F"];
    if (sheetF) {
      const data: unknown[][] = XLSX.utils.sheet_to_json(sheetF, { header: 1, defval: "" });
      for (let r = 4; r < data.length; r++) {
        const rowData = data[r] as unknown[];
        const nome = str(row(rowData, 3), 255);
        if (!nome) continue;
        const cpf = str(row(rowData, 4), 20);
        const dataNasc = excelSerialToDate(row(rowData, 6) as number);
        try {
          const [inserted] = await db
            .insert(clientes)
            .values({
              tipo: "PF",
              nome,
              cpf: cpf ?? undefined,
              sexo: str(row(rowData, 5), 5) ?? undefined,
              dataNascimento: dataNasc ?? undefined,
              telefone: str(row(rowData, 8), 50) ?? undefined,
              email: str(row(rowData, 9), 255) ?? undefined,
              endereco: str(row(rowData, 10), 255) ?? undefined,
              bairro: str(row(rowData, 11), 120) ?? undefined,
              cep: str(row(rowData, 12), 20) ?? undefined,
              cidade: str(row(rowData, 13), 120) ?? undefined,
              estado: str(row(rowData, 14), 5) ?? undefined,
              profissao: str(row(rowData, 15), 120) ?? undefined,
              estadoCivil: str(row(rowData, 16), 50) ?? undefined,
              comoConheceu: str(row(rowData, 17), 120) ?? undefined,
              observacoes: str(row(rowData, 18)) ?? undefined,
            })
            .returning({ id: clientes.id });
          if (inserted) {
            resultado.clientesInseridos++;
            mapClienteNomeToId.set(nome.toUpperCase().trim(), inserted.id);
          }
        } catch (e) {
          resultado.erros.push(`Clie-F linha ${r + 1}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }

    // Clie-J: dados a partir da linha 5 (índice 4)
    const sheetJ = wb.Sheets["Clie-J"];
    if (sheetJ) {
      const data: unknown[][] = XLSX.utils.sheet_to_json(sheetJ, { header: 1, defval: "" });
      for (let r = 4; r < data.length; r++) {
        const rowData = data[r] as unknown[];
        const nomeFantasia = str(row(rowData, 1), 255);
        const razaoSocial = str(row(rowData, 2), 255);
        const nome = nomeFantasia || razaoSocial || "";
        if (!nome) continue;
        const cnpj = str(row(rowData, 3), 20);
        const dataCadastro = excelSerialToDate(row(rowData, 15) as number);
        try {
          const [inserted] = await db
            .insert(clientes)
            .values({
              tipo: "PJ",
              nome,
              razaoSocial: razaoSocial ?? undefined,
              cnpj: cnpj ?? undefined,
              telefone: str(row(rowData, 4), 50) ?? undefined,
              email: str(row(rowData, 5), 255) ?? undefined,
              endereco: str(row(rowData, 6), 255) ?? undefined,
              bairro: str(row(rowData, 7), 120) ?? undefined,
              cep: str(row(rowData, 8), 20) ?? undefined,
              cidade: str(row(rowData, 9), 120) ?? undefined,
              estado: str(row(rowData, 10), 5) ?? undefined,
              segmentoAtuacao: str(row(rowData, 11), 120) ?? undefined,
              responsavelLegal: str(row(rowData, 12), 255) ?? undefined,
              comoConheceu: str(row(rowData, 13), 120) ?? undefined,
              observacoes: str(row(rowData, 14)) ?? undefined,
            })
            .returning({ id: clientes.id });
          if (inserted) {
            resultado.clientesInseridos++;
            mapClienteNomeToId.set(nome.toUpperCase().trim(), inserted.id);
          }
        } catch (e) {
          resultado.erros.push(`Clie-J linha ${r + 1}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }

    // Carregar clientes já existentes para casar processos
    const existentes = await db.select({ id: clientes.id, nome: clientes.nome }).from(clientes);
    for (const c of existentes) {
      const key = (c.nome || "").toUpperCase().trim();
      if (key && !mapClienteNomeToId.has(key)) mapClienteNomeToId.set(key, c.id);
    }
  }

  if (importarProcessos) {
    if (mapClienteNomeToId.size === 0) {
      const existentes = await db.select({ id: clientes.id, nome: clientes.nome }).from(clientes);
      for (const c of existentes) {
        const key = (c.nome || "").toUpperCase().trim();
        if (key) mapClienteNomeToId.set(key, c.id);
      }
    }
    const usuariosList = await db
      .select({
        id: usuarios.id,
        nome: usuarios.nome,
        sobrenome: usuarios.sobrenome,
      })
      .from(usuarios)
      .where(eq(usuarios.ativo, true));
    const advogadoByNome = new Map<string, number>();
    for (const u of usuariosList) {
      const n = `${(u.nome || "").trim()} ${(u.sobrenome || "").trim()}`.trim().toUpperCase();
      if (n) advogadoByNome.set(n, u.id);
    }

    const sheetProc = wb.Sheets["Proc-G"];
    if (!sheetProc) {
      resultado.erros.push("Aba Proc-G não encontrada.");
    } else {
      const data: unknown[][] = XLSX.utils.sheet_to_json(sheetProc, { header: 1, defval: "" });
      let ordem = 0;
      for (let r = 6; r < data.length; r++) {
        const rowData = data[r] as unknown[];
        const numeroCnj = str(row(rowData, 4), 50);
        if (!numeroCnj || numeroCnj.length < 10) continue;
        ordem++;

        const nomeClientePlanilha = str(row(rowData, 7), 255);
        const idCliente = nomeClientePlanilha
          ? mapClienteNomeToId.get(nomeClientePlanilha.toUpperCase().trim()) ?? null
          : null;

        const nomeAdvPlanilha = str(row(rowData, 11), 255);
        const idAdvogado = nomeAdvPlanilha
          ? advogadoByNome.get(nomeAdvPlanilha.replace(/\s+/g, " ").trim().toUpperCase()) ?? null
          : null;

        const valorCausa = row(rowData, 12);
        const valorCausaStr = valorCausa != null && valorCausa !== "" ? String(valorCausa) : null;
        const valorAcordo = row(rowData, 13);
        const valorAcordoStr = valorAcordo != null && valorAcordo !== "" ? String(valorAcordo) : null;

        const prazoAberto = row(rowData, 18);
        const prazoEmAberto =
          prazoAberto === "Sim" || prazoAberto === true || prazoAberto === 1
            ? true
            : prazoAberto === "Não" || prazoAberto === false || prazoAberto === 0
              ? false
              : null;

        const values = {
          numeroCnj,
          status: str(row(rowData, 1), 30) || "Ativo",
          tipo: str(row(rowData, 2), 30) ?? undefined,
          fase: str(row(rowData, 3), 80) ?? undefined,
          tipoAcao: str(row(rowData, 5), 120) ?? undefined,
          tipoCliente: str(row(rowData, 6), 20) ?? undefined,
          idCliente: idCliente ?? undefined,
          nomeCliente: nomeClientePlanilha ?? undefined,
          qualificacaoCliente: str(row(rowData, 8), 60) ?? undefined,
          outroEnvolvido: str(row(rowData, 9), 255) ?? undefined,
          qualificacaoOutro: str(row(rowData, 10), 60) ?? undefined,
          idAdvogadoResponsavel: idAdvogado ?? undefined,
          nomeAdvogado: nomeAdvPlanilha ?? undefined,
          valorCausa: valorCausaStr ?? undefined,
          valorAcordoSentenca: valorAcordoStr ?? undefined,
          valorHonorariosReais: str(row(rowData, 14), 50) ?? undefined,
          valorHonorariosPercentual: str(row(rowData, 15), 30) ?? undefined,
          sucumbencias: str(row(rowData, 16), 100) ?? undefined,
          totalHonorarios: str(row(rowData, 17), 100) ?? undefined,
          prazoEmAberto: prazoEmAberto ?? undefined,
          dataPrazo: excelSerialToDate(row(rowData, 19) as number) ?? undefined,
          instancia: str(row(rowData, 20), 80) ?? undefined,
          comarca: str(row(rowData, 21), 120) ?? undefined,
          vara: str(row(rowData, 22), 120) ?? undefined,
          observacoes: str(row(rowData, 23)) ?? undefined,
          dataInicio: excelSerialToDate(row(rowData, 24) as number) ?? undefined,
          dataFim: excelSerialToDate(row(rowData, 25) as number) ?? undefined,
          duracaoTexto: str(row(rowData, 26), 50) ?? undefined,
          resultado: str(row(rowData, 27), 80) ?? undefined,
          linkProcesso: str(row(rowData, 28), 500) ?? undefined,
          linkPastaDocumentos: str(row(rowData, 29), 500) ?? undefined,
          titulo: str(row(rowData, 31), 400) ?? str(row(rowData, 32), 400) ?? undefined,
        };

        try {
          const [existing] = await db
            .select({ id: processos.id })
            .from(processos)
            .where(eq(processos.numeroCnj, numeroCnj))
            .limit(1);
          if (existing) {
            await db.update(processos).set(values).where(eq(processos.id, existing.id));
            resultado.processosAtualizados++;
            mapProcessoOrdemToId.set(ordem, existing.id);
            mapProcessoNumeroToId.set(numeroCnj.trim(), existing.id);
          } else {
            const [inserted] = await db.insert(processos).values(values).returning({ id: processos.id });
            if (inserted) {
              resultado.processosInseridos++;
              mapProcessoOrdemToId.set(ordem, inserted.id);
              mapProcessoNumeroToId.set(numeroCnj.trim(), inserted.id);
            }
          }
        } catch (e) {
          resultado.erros.push(`Proc-G linha ${r + 1} (${numeroCnj}): ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
  }

  if (importarMovimentacoes && (mapProcessoNumeroToId.size > 0 || mapProcessoOrdemToId.size > 0)) {
    const sheetM = wb.Sheets["Proc-M"];
    if (sheetM) {
      const data: unknown[][] = XLSX.utils.sheet_to_json(sheetM, { header: 1, defval: "" });
      const processoIdsByOrder = Array.from(mapProcessoOrdemToId.entries()).sort((a, b) => a[0] - b[0]);
      for (let r = 4; r < data.length; r++) {
        const rowData = data[r] as unknown[];
        const ref = row(rowData, 1);
        const movimentacao = str(row(rowData, 2));
        const dataMov = excelSerialToDate(row(rowData, 3) as number);
        let idProcesso: number | undefined;
        if (typeof ref === "string" && ref.trim().length > 5 && /[\d\-.]/.test(ref)) {
          idProcesso = mapProcessoNumeroToId.get(ref.trim());
        }
        if (idProcesso == null && typeof ref === "number" && ref >= 1) {
          const found = processoIdsByOrder.find(([ord]) => ord === ref);
          if (found) idProcesso = found[1];
        }
        if (idProcesso == null) continue;
        try {
          await db.insert(movimentacoesProcesso).values({
            idProcesso,
            ordem: r - 3,
            movimentacao: movimentacao ?? undefined,
            dataMovimentacao: dataMov ?? undefined,
          });
          resultado.movimentacoesInseridas++;
        } catch (_) {}
      }
    }
  }

  return resultado;
}
