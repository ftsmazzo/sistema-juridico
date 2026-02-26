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
import { publicacaoPorPrint } from "./routes/publicacoes-por-print.js";
import { login } from "./routes/auth.js";
import { listPessoas, createPessoa, updatePessoa } from "./routes/pessoas.js";
import { listUsuarios, createUsuario, updateUsuario } from "./routes/usuarios.js";
import { runMigrations } from "./db/run-migrate.js";
import { runSeedGestores } from "./db/seed-gestores.js";
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
app.get("/api/prazos", listPrazos);
app.get("/api/publicacoes", listPublicacoes);
app.get("/api/publicacoes/:id", getPublicacaoById);
app.patch("/api/publicacoes/:id", updatePublicacao);
app.post("/api/publicacoes/por-print", requireAuth, publicacaoPorPrint);

app.get("/api/pessoas", requireAuth, listPessoas);
app.post("/api/pessoas", requireAuth, createPessoa);
app.patch("/api/pessoas/:id", requireAuth, updatePessoa);

app.get("/api/usuarios", requireAuth, listUsuarios);
app.post("/api/usuarios", requireAuth, createUsuario);
app.patch("/api/usuarios/:id", requireAuth, updateUsuario);

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
  });
}

start().catch((err) => {
  console.error("Falha ao iniciar:", err);
  process.exit(1);
});
