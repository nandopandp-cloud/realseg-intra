import { request, type FullConfig } from "@playwright/test";
import fs from "node:fs";
import { authFile, PASSWORD, USERS, type UserKey } from "./users";

/** Faz login real (API) uma vez por usuário e salva o estado de sessão. */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL!;
  fs.mkdirSync("e2e/.auth", { recursive: true });
  for (const key of Object.keys(USERS) as UserKey[]) {
    const ctx = await request.newContext({ baseURL, extraHTTPHeaders: { origin: baseURL } });
    const res = await ctx.post("/api/v1/auth/login", { data: { identifier: USERS[key].login, password: PASSWORD } });
    if (!res.ok()) throw new Error(`Falha no login E2E de ${key}: ${res.status()}`);
    await ctx.storageState({ path: authFile(key) });
    await ctx.dispose();
  }
}
