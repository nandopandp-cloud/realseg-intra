import path from "node:path";
import { defineConfig } from "vitest/config";

const alias = {
  "@": path.resolve(import.meta.dirname, "src"),
  // `server-only` lança erro fora do bundle de servidor do Next; nos testes é inócuo.
  "server-only": path.resolve(import.meta.dirname, "tests/support/empty.ts"),
};

const TEST_DB_PORT = 54321;

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
          env: { NODE_ENV: "test", TZ: "UTC" },
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          globalSetup: ["tests/support/global-setup.ts"],
          setupFiles: ["tests/support/integration-setup.ts"],
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
          env: {
            NODE_ENV: "test",
            TZ: "UTC",
            APP_ENV: "test",
            APP_URL: "http://localhost:3000",
            DATABASE_URL: `postgres://realseg:realseg@localhost:${TEST_DB_PORT}/realseg_test`,
            IP_HASH_SECRET: "integration-tests-secret-value",
            STORAGE_DIR: ".data/storage-test",
            MAIL_DRIVER: "outbox",
            SESSION_IDLE_MINUTES: "60",
            SESSION_ABSOLUTE_HOURS: "12",
          },
        },
      },
    ],
  },
});
