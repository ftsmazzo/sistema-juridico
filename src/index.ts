import "dotenv/config";
import express from "express";
import { handlePublicacoesOab } from "./routes/webhooks/publicacoes-oab.js";
import { runMigrations } from "./db/run-migrate.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "agenda-prazos-api" });
});

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
