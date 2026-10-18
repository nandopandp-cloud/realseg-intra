// Aplica migrações versionadas de ./drizzle (idempotente). Uso: pnpm db:migrate
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

export async function runMigrations(url: string) {
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definido");
  runMigrations(url)
    .then(() => console.log("Migrações aplicadas."))
    .catch((err) => {
      console.error("Falha ao aplicar migrações:", err.message);
      process.exit(1);
    });
}
