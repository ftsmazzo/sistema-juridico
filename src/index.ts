import "dotenv/config";
import cors from "cors";
import express from "express";
import { handlePublicacoesOab } from "./routes/webhooks/publicacoes-oab.js";
import { getDashboard } from "./routes/dashboard.js";
import { listPrazos } from "./routes/prazos.js";
import {
  listPublicacoes,
  getPublicacaoById,
  updatePublicacao,
} from "./routes/publicacoes.js";
import { runMigrations } from "./db/run-migrate.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "agenda-prazos-api" });
});

app.get("/api/dashboard", getDashboard);
app.get("/api/prazos", listPrazos);
app.get("/api/publicacoes", listPublicacoes);
app.get("/api/publicacoes/:id", getPublicacaoById);
app.patch("/api/publicacoes/:id", updatePublicacao);
app.post("/api/webhooks/publicacoes-oab", handlePublicacoesOab);

async function start() {
  await runMigrations();
  app.listen(PORT, () => {
    console.log(`API rodando em http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Falha ao iniciar:", err);
  process.exit(1);
});
