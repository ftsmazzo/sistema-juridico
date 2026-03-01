import "dotenv/config";
import cors from "cors";
import express from "express";
import { handlePublicacoesOab } from "./routes/webhooks/publicacoes-oab.js";
import { getDashboard } from "./routes/dashboard.js";
import { listPrazos } from "./routes/prazos.js";
import { getExportIcs, getFeedIcs, getLinkInscricao } from "./routes/prazos-ical.js";
import {
  listPublicacoes,
  getPublicacaoById,
  updatePublicacao,
} from "./routes/publicacoes.js";
import { dispararAnaliseN8n } from "./routes/publicacoes-disparar-n8n.js";
import { publicacaoPorPrint } from "./routes/publicacoes-por-print.js";
import { login } from "./routes/auth.js";
import { listPessoas, createPessoa, updatePessoa } from "./routes/pessoas.js";
import { listUsuarios, getUsuarioById, createUsuario, updateUsuario } from "./routes/usuarios.js";
import {
  listClientes,
  getClienteById,
  createCliente,
  updateCliente,
} from "./routes/clientes.js";
import {
  listProcessos,
  getProcessoById,
  createProcesso,
  updateProcesso,
  enriquecerProcessosComEscavador,
  popularMovimentacoesPublicacoes,
  popularMovimentacoesEscavador,
} from "./routes/processos.js";
import { importarExcelProcessos } from "./routes/processos-importar.js";
import {
  salvarDadosEscavador,
  listarDadosEscavador,
  sincronizarDadosEscavador,
} from "./routes/dados-escavador.js";
import { limparDados } from "./routes/admin/limpar-dados.js";
import { emailMonitorTest } from "./routes/email-monitor-test.js";
import {
  getEmailMonitorConfig,
  putEmailMonitorConfig,
  postVerificarAgora,
  listContas,
  getContaById,
  postConta,
  putConta,
  deleteConta,
} from "./routes/email-monitor-config.js";
import { runMigrations } from "./db/run-migrate.js";
import { runSeedGestores } from "./db/seed-gestores.js";
import { startEmailMonitorScheduler } from "./lib/email-monitor-scheduler.js";
import { requireAuth } from "./middleware/auth.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "agenda-prazos-api" });
});

app.post("/api/auth/login", login);

app.get("/api/dashboard", getDashboard);
app.get("/api/prazos/export.ics", requireAuth, getExportIcs);
app.get("/api/prazos/feed.ics", getFeedIcs);
app.get("/api/prazos/link-inscricao", requireAuth, getLinkInscricao);
app.get("/api/prazos", listPrazos);
app.get("/api/publicacoes", listPublicacoes);
app.get("/api/publicacoes/:id", getPublicacaoById);
app.patch("/api/publicacoes/:id", updatePublicacao);
app.post("/api/publicacoes/:id/disparar-analise-n8n", requireAuth, dispararAnaliseN8n);
app.post("/api/publicacoes/por-print", requireAuth, publicacaoPorPrint);

app.get("/api/pessoas", requireAuth, listPessoas);
app.post("/api/pessoas", requireAuth, createPessoa);
app.patch("/api/pessoas/:id", requireAuth, updatePessoa);

app.get("/api/usuarios", requireAuth, listUsuarios);
app.get("/api/usuarios/:id", requireAuth, getUsuarioById);
app.post("/api/usuarios", requireAuth, createUsuario);
app.patch("/api/usuarios/:id", requireAuth, updateUsuario);

app.get("/api/clientes", requireAuth, listClientes);
app.get("/api/clientes/:id", requireAuth, getClienteById);
app.post("/api/clientes", requireAuth, createCliente);
app.patch("/api/clientes/:id", requireAuth, updateCliente);

app.get("/api/processos", requireAuth, listProcessos);
app.post("/api/processos/enriquecer-escavador", requireAuth, enriquecerProcessosComEscavador);
app.get("/api/processos/:id", requireAuth, getProcessoById);
app.post("/api/processos/:id/popular-movimentacoes-publicacoes", requireAuth, popularMovimentacoesPublicacoes);
app.post("/api/processos/:id/popular-movimentacoes-escavador", requireAuth, popularMovimentacoesEscavador);
app.post("/api/processos", requireAuth, createProcesso);
app.patch("/api/processos/:id", requireAuth, updateProcesso);
app.post("/api/processos/importar-excel", requireAuth, importarExcelProcessos);

app.get("/api/dados-escavador", requireAuth, listarDadosEscavador);
app.post("/api/dados-escavador", requireAuth, salvarDadosEscavador);
app.post("/api/dados-escavador/sincronizar", requireAuth, sincronizarDadosEscavador);

app.post("/api/admin/limpar-dados", requireAuth, limparDados);

app.post("/api/email-monitor/test", requireAuth, emailMonitorTest);
app.get("/api/email-monitor/config", requireAuth, getEmailMonitorConfig);
app.put("/api/email-monitor/config", requireAuth, putEmailMonitorConfig);
app.get("/api/email-monitor/contas", requireAuth, listContas);
app.get("/api/email-monitor/contas/:id", requireAuth, getContaById);
app.post("/api/email-monitor/contas", requireAuth, postConta);
app.put("/api/email-monitor/contas/:id", requireAuth, putConta);
app.delete("/api/email-monitor/contas/:id", requireAuth, deleteConta);
app.post("/api/email-monitor/verificar-agora", requireAuth, postVerificarAgora);

app.post("/api/webhooks/publicacoes-oab", handlePublicacoesOab);

async function start() {
  await runMigrations();
  try {
    await runSeedGestores();
  } catch (err) {
    console.warn("Seed gestores:", err);
  }
  app.listen(PORT, () => {
    console.log(`API rodando em http://localhost:${PORT}`);
    startEmailMonitorScheduler();
  });
}

start().catch((err) => {
  console.error("Falha ao iniciar:", err);
  process.exit(1);
});
