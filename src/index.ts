import "dotenv/config";
import express from "express";
import { handlePublicacoesOab } from "./routes/webhooks/publicacoes-oab.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "agenda-prazos-api" });
});

app.post("/api/webhooks/publicacoes-oab", handlePublicacoesOab);

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
