/**
 * Executa a manutenção diária manualmente (a mesma do Vercel Cron em /api/cron/daily).
 * Uso: pnpm jobs:run
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ quiet: true });

import { closeDb } from "@/server/db/client";
import { runDailyMaintenance } from "@/server/jobs/maintenance";

runDailyMaintenance()
  .catch((err) => {
    console.error("Falha na manutenção:", err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
