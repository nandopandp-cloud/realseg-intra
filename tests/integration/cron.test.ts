import { sql } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { GET } from "@/app/api/cron/daily/route";
import { getDb } from "@/server/db/client";
import { resetDatabase } from "../support/db";

const call = (auth?: string) => GET(new Request("http://localhost:3000/api/cron/daily", { headers: auth ? { authorization: auth } : {} }));

beforeAll(async () => {
  await resetDatabase();
});
afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe("cron diário", () => {
  it("sem CRON_SECRET configurado a rota não existe", async () => {
    expect((await call("Bearer x")).status).toBe(404);
  });

  it("recusa segredo ausente ou errado", async () => {
    process.env.CRON_SECRET = "segredo-de-teste-123";
    expect((await call()).status).toBe(401);
    expect((await call("Bearer errado")).status).toBe(401);
  });

  it("executa a manutenção e limpa sessões e links vencidos", async () => {
    process.env.CRON_SECRET = "segredo-de-teste-123";
    const db = getDb();
    await db.execute(sql`insert into sessions (id, user_id, expires_at) select 'velha-' || id, id, now() - interval '40 days' from users limit 1`);
    const res = await call("Bearer segredo-de-teste-123");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessionsDeleted).toBeGreaterThanOrEqual(1);
    expect(body.sla).toMatchObject({ breached: expect.any(Number) });
  });
});
