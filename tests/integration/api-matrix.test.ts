import { beforeAll, describe, expect, it } from "vitest";
import { apiRequest, resetDatabase, sessionCookie, type People } from "../support/db";

/** Todos os Route Handlers de /api/v1 (descobertos automaticamente). */
const modules = import.meta.glob("../../src/app/api/v1/**/route.ts");
const PUBLIC = ["/auth/login/", "/auth/password/forgot/", "/auth/password/reset/"];
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
const FAKE = { id: "00000000-0000-4000-8000-000000000000", fileId: "00000000-0000-4000-8000-000000000001", number: "999999", slug: "inexistente" };

function routePath(file: string) {
  return file.replace(/^.*\/app\/api\/v1/, "").replace(/\/route\.ts$/, "/");
}

let people: People;
beforeAll(async () => {
  people = await resetDatabase();
});

describe("matriz de autenticação da API", () => {
  const entries = Object.entries(modules).filter(([f]) => !PUBLIC.some((p) => routePath(f).startsWith(p)));

  it("descobre as rotas", () => {
    expect(entries.length).toBeGreaterThan(40);
  });

  it("toda rota protegida responde 401 sem sessão", async () => {
    const failures: string[] = [];
    for (const [file, load] of entries) {
      const mod = (await load()) as Record<string, (req: unknown, ctx: unknown) => Promise<Response>>;
      for (const m of METHODS) {
        if (!mod[m]) continue;
        const path = routePath(file).replace(/\[(\w+)\]/g, (_, k: keyof typeof FAKE) => FAKE[k] ?? "x");
        const res = await mod[m](apiRequest(`/api/v1${path}`, { method: m }), { params: Promise.resolve(FAKE) });
        if (res.status !== 401) failures.push(`${m} ${path} → ${res.status}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("recursos inexistentes/alheios respondem 404 (nunca 500) com sessão válida", async () => {
    const cookie = await sessionCookie(people.carlos.user.id);
    const failures: string[] = [];
    for (const [file, load] of entries) {
      if (!/\[(id|number|slug|fileId)\]/.test(file)) continue;
      const mod = (await load()) as Record<string, (req: unknown, ctx: unknown) => Promise<Response>>;
      if (!mod.GET) continue;
      const path = routePath(file).replace(/\[(\w+)\]/g, (_, k: keyof typeof FAKE) => FAKE[k] ?? "x");
      const res = await mod.GET(apiRequest(`/api/v1${path}`, { cookie }), { params: Promise.resolve(FAKE) });
      if (res.status !== 404) failures.push(`GET ${path} → ${res.status}`);
    }
    expect(failures).toEqual([]);
  });
});
