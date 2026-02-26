/**
 * Script para rodar o seed dos gestores manualmente.
 * Na subida da API o seed já roda automaticamente.
 */
import "dotenv/config";
import { runSeedGestores } from "../db/seed-gestores.js";

runSeedGestores()
  .then(() => {
    console.log("Concluído.");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
