import XLSX from "xlsx";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const path = join(__dirname, "Planilha Processos_LNSA.xlsx");
const buf = readFileSync(path);
const wb = XLSX.read(buf, { type: "buffer" });

console.log("=== ABAS (SHEETS) ===\n", wb.SheetNames.join("\n"));
console.log("\n");

// Foco: abas que parecem ter cadastro de processos
const focar = ["Proc-G", "Proc-D", "Proc-M", "Conf-P", "Clie-F", "Clie-J"];
const sheets = focar.every((f) => wb.SheetNames.includes(f))
  ? focar
  : wb.SheetNames;

sheets.forEach((name) => {
  const sheet = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  console.log("=== ABA:", name, "===");
  console.log("Linhas totais:", data.length);
  if (data.length > 0) {
    // Mostrar linhas 0 a 15 para achar onde começa a tabela
    console.log("Primeiras 20 linhas (procurar cabeçalho da tabela):");
    data.slice(0, 20).forEach((row, i) => {
      const compact = row.filter((c) => c !== "" && c != null);
      if (compact.length > 0) console.log(i + 1, compact);
    });
  }
  console.log("\n");
});
