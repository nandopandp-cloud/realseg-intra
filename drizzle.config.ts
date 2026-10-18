import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgres://realseg:realseg@localhost:54320/realseg" },
  strict: true,
  verbose: true,
});
