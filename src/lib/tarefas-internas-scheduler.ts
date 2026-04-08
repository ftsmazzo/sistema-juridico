/**
 * Alerta D−3 (dias úteis) para tarefas internas, apenas entre 9h e 14h (America/Sao_Paulo).
 */
import { processarAlertasD3TarefasInternas } from "../routes/tarefas-internas.js";

const TICK_MS = 3 * 60 * 1000;

export function startTarefasInternasScheduler(): void {
  setInterval(() => {
    processarAlertasD3TarefasInternas()
      .then((n) => {
        if (n > 0) console.log(`Tarefas internas: ${n} alerta(s) D-3 enviado(s).`);
      })
      .catch((err) => console.error("Scheduler tarefas internas:", err));
  }, TICK_MS);
}
