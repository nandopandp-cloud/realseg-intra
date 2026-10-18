// Build na Vercel (script "vercel-build"). docs/COST_OPTIMIZATION.md §6.
// - Production: aplica migrações + seed idempotente no Neon e depois compila.
// - Preview: NÃO toca no banco (ele é o de produção até existir um branch Neon por preview),
//   a menos que PREVIEW_DB_TASKS=true esteja definido para o ambiente Preview.
import { execSync } from "node:child_process";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });
const isPreview = process.env.VERCEL_ENV === "preview";

if (isPreview && process.env.PREVIEW_DB_TASKS !== "true") {
  console.log("Preview: migrações e seed ignorados (banco compartilhado com produção).");
} else {
  run("npx tsx scripts/migrate.ts");
  run("npx tsx --conditions=react-server scripts/seed/index.ts deploy");
}
run("npx next build");
