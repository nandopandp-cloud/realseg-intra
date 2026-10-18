/**
 * Uso:
 *   pnpm db:seed          → somente dados de referência (qualquer ambiente)
 *   pnpm db:seed:demo     → referência + demonstração (somente dev; recusado em produção)
 *   pnpm db:reset:demo    → apaga o schema, migra e popula referência + demonstração (somente dev)
 *   (build na Vercel)     → modo "deploy": referência sempre; demonstração só se SEED_DEMO=true e APP_ENV ≠ production
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ quiet: true });

import { sql } from "drizzle-orm";
import { closeDb, getDb } from "@/server/db/client";
import { runMigrations } from "../migrate";
import { seedReference } from "./reference";

// Seeds usam a conexão direta quando disponível.
if (process.env.DATABASE_URL_UNPOOLED) process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;

const requested = process.argv[2] ?? "reference";
const mode = requested === "deploy" ? (process.env.SEED_DEMO === "true" ? "demo" : "reference") : requested;
// Produção é definida por APP_ENV (NODE_ENV=production também ocorre em builds de homologação).
const isProd = process.env.APP_ENV === "production" || (!process.env.APP_ENV && process.env.NODE_ENV === "production");

async function main() {
  if (mode !== "reference" && isProd) throw new Error("Dados de demonstração/E2E são proibidos em produção (ADR-0010).");
  const db = getDb();
  if (mode === "reset-demo" || mode === "e2e") {
    await db.execute(sql`drop schema if exists public cascade`);
    await db.execute(sql`drop schema if exists drizzle cascade`);
    await db.execute(sql`create schema public`);
    await runMigrations(process.env.DATABASE_URL!);
  }
  await seedReference(db);
  if (mode === "demo" || mode === "reset-demo") {
    const { count } = (await db.execute<{ count: number }>(sql`select count(*)::int as count from employees`)).rows[0];
    if (count > 0) {
      console.log("Dados de demonstração já existem — use `pnpm db:reset:demo` para recriar.");
      return;
    }
    const { seedDemo, DEMO_PASSWORD, DEMO_DOMAIN } = await import("./demo");
    await seedDemo(db);
    console.log(`Demonstração criada. Entre com carlos.silva@${DEMO_DOMAIN} (ou matrícula 100231)${process.env.DEMO_PASSWORD ? " com a senha definida em DEMO_PASSWORD" : ` e senha ${DEMO_PASSWORD}`}.`);
  }
  if (mode === "e2e") {
    const { seedE2E } = await import("./e2e");
    await seedE2E(db);
  }
  console.log(`Seed "${mode}" concluído.`);
}

main()
  .catch((err) => {
    console.error("Falha no seed:", err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
