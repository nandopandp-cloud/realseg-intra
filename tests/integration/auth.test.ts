import { desc, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { POST as loginRoute } from "@/app/api/v1/auth/login/route";
import { POST as logoutRoute } from "@/app/api/v1/auth/logout/route";
import { POST as forgotRoute } from "@/app/api/v1/auth/password/forgot/route";
import { getDb } from "@/server/db/client";
import { auditEvents, mailOutbox, sessions, users } from "@/server/db/schema";
import { validateSessionToken } from "@/server/auth/session";
import { changePassword, login, requestPasswordReset, resetPassword } from "@/server/services/auth";
import { apiRequest, ctxFor, params, resetDatabase, testMeta, type People } from "../support/db";

const PASSWORD = "Realseg@2026";
let people: People;

beforeEach(async () => {
  people = await resetDatabase();
});

describe("login", () => {
  it("aceita e-mail ou matrícula e cria sessão válida com permissões do papel", async () => {
    const byEmail = await login({ identifier: "CARLOS.SILVA@demo.realseg.invalid", password: PASSWORD }, testMeta);
    const byRegistration = await login({ identifier: "100231", password: PASSWORD }, testMeta);
    const v = await validateSessionToken(byEmail.token);
    expect(v.status).toBe("valid");
    if (v.status !== "valid") return;
    expect(v.actor.userId).toBe(people.carlos.user.id);
    expect(v.actor.employee?.registrationNumber).toBe("100231");
    expect(v.actor.permissions.has("document:read:own")).toBe(true);
    expect(v.actor.permissions.has("document:read:any")).toBe(false);
    expect((await validateSessionToken(byRegistration.token)).status).toBe("valid");
  });

  it("senha errada: mensagem genérica, contador incrementado e auditoria sem a senha", async () => {
    await expect(login({ identifier: "100231", password: "errada" }, testMeta)).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    const [u] = await getDb().select().from(users).where(eq(users.id, people.carlos.user.id));
    expect(u.failedLoginCount).toBe(1);
    const [ev] = await getDb().select().from(auditEvents).where(eq(auditEvents.action, "auth.login_failed")).orderBy(desc(auditEvents.id)).limit(1);
    expect(ev.actorUserId).toBe(people.carlos.user.id);
    expect(JSON.stringify(ev.metadata)).not.toContain("errada");
  });

  it("bloqueia após 5 falhas, mesmo com a senha correta", async () => {
    for (let i = 0; i < 5; i++) {
      await expect(login({ identifier: "100231", password: "errada" }, testMeta)).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    }
    await expect(login({ identifier: "100231", password: PASSWORD }, testMeta)).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });

  it("identificador inexistente recebe a mesma resposta e o mesmo limite (sem enumeração)", async () => {
    for (let i = 0; i < 5; i++) {
      await expect(login({ identifier: "ninguem@x.com", password: "x" }, testMeta)).rejects.toMatchObject({ code: "INVALID_CREDENTIALS", message: "E-mail/matrícula ou senha incorretos." });
    }
    await expect(login({ identifier: "ninguem@x.com", password: "x" }, testMeta)).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });

  it("usuário inativo não entra", async () => {
    await getDb().update(users).set({ status: "inactive" }).where(eq(users.id, people.ana.user.id));
    await expect(login({ identifier: "100198", password: PASSWORD }, testMeta)).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });
});

describe("sessão", () => {
  it("expira por tempo absoluto e por inatividade; inativação do usuário invalida", async () => {
    const a = await login({ identifier: "100231", password: PASSWORD }, testMeta);
    const db = getDb();
    await db.update(sessions).set({ expiresAt: sql`now() - interval '1 minute'` });
    expect((await validateSessionToken(a.token)).status).toBe("expired");

    const b = await login({ identifier: "100231", password: PASSWORD }, testMeta);
    await db.update(sessions).set({ lastSeenAt: sql`now() - interval '61 minutes'` }).where(sql`revoked_at is null and expires_at > now()`);
    expect((await validateSessionToken(b.token)).status).toBe("expired");

    const c = await login({ identifier: "100231", password: PASSWORD }, testMeta);
    await db.update(users).set({ status: "inactive" }).where(eq(users.id, people.carlos.user.id));
    expect((await validateSessionToken(c.token)).status).toBe("invalid");
  });

  it("token adulterado é inválido", async () => {
    expect((await validateSessionToken("x".repeat(43))).status).toBe("invalid");
  });
});

describe("recuperação e alteração de senha", () => {
  async function lastResetToken() {
    const [mail] = await getDb().select().from(mailOutbox).orderBy(desc(mailOutbox.createdAt)).limit(1);
    return /token=([A-Za-z0-9_%-]+)/.exec(mail.text)![1];
  }

  it("fluxo completo: token de uso único, sessões antigas revogadas", async () => {
    const old = await login({ identifier: "100231", password: PASSWORD }, testMeta);
    await requestPasswordReset("carlos.silva@demo.realseg.invalid", testMeta);
    const token = decodeURIComponent(await lastResetToken());
    await resetPassword({ token, password: "NovaSenha2026", confirmPassword: "NovaSenha2026" }, testMeta);
    expect((await validateSessionToken(old.token)).status).toBe("invalid");
    await expect(login({ identifier: "100231", password: PASSWORD }, testMeta)).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    await expect(login({ identifier: "100231", password: "NovaSenha2026" }, testMeta)).resolves.toBeTruthy();
    await expect(resetPassword({ token, password: "OutraSenha2026", confirmPassword: "OutraSenha2026" }, testMeta)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("token expirado é rejeitado", async () => {
    await requestPasswordReset("carlos.silva@demo.realseg.invalid", testMeta);
    const token = decodeURIComponent(await lastResetToken());
    await getDb().execute(sql`update password_reset_tokens set expires_at = now() - interval '1 second'`);
    await expect(resetPassword({ token, password: "NovaSenha2026", confirmPassword: "NovaSenha2026" }, testMeta)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("e-mail inexistente não gera mensagem nem erro", async () => {
    await requestPasswordReset("ninguem@demo.realseg.invalid", testMeta);
    const mails = await getDb().select().from(mailOutbox);
    expect(mails).toHaveLength(0);
  });

  it("alteração exige senha atual e preserva somente a sessão corrente", async () => {
    const other = await login({ identifier: "100231", password: PASSWORD }, testMeta);
    const ctx = await ctxFor(people.carlos.user);
    await expect(changePassword(ctx, { currentPassword: "errada", password: "NovaSenha2026", confirmPassword: "NovaSenha2026" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await changePassword(ctx, { currentPassword: PASSWORD, password: "NovaSenha2026", confirmPassword: "NovaSenha2026" });
    expect((await validateSessionToken(other.token)).status).toBe("invalid");
    const [current] = await getDb().select().from(sessions).where(eq(sessions.id, ctx.actor.sessionId));
    expect(current.revokedAt).toBeNull();
  });
});

describe("rotas HTTP de autenticação", () => {
  it("login define cookie HttpOnly e SameSite=Lax", async () => {
    const res = await loginRoute(apiRequest("/api/v1/auth/login", { method: "POST", json: { identifier: "100231", password: PASSWORD } }), params({}));
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/rs_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
  });

  it("rejeita origem cruzada ou ausente (CSRF)", async () => {
    const cross = await loginRoute(apiRequest("/api/v1/auth/login", { method: "POST", origin: "https://evil.example", json: { identifier: "100231", password: PASSWORD } }), params({}));
    expect(cross.status).toBe(403);
    const missing = await loginRoute(apiRequest("/api/v1/auth/login", { method: "POST", origin: null, json: { identifier: "100231", password: PASSWORD } }), params({}));
    expect(missing.status).toBe(403);
    expect((await missing.json()).error.code).toBe("CSRF_REJECTED");
  });

  it("valida payload com erros por campo", async () => {
    const res = await loginRoute(apiRequest("/api/v1/auth/login", { method: "POST", json: { identifier: "", password: "" } }), params({}));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.details.identifier[0]).toBe("Informe seu e-mail ou matrícula.");
  });

  it("logout sem sessão retorna 401; com sessão revoga e limpa cookie", async () => {
    const anon = await logoutRoute(apiRequest("/api/v1/auth/logout", { method: "POST" }), params({}));
    expect(anon.status).toBe(401);
    const { token } = await login({ identifier: "100231", password: PASSWORD }, testMeta);
    const res = await logoutRoute(apiRequest("/api/v1/auth/logout", { method: "POST", cookie: `rs_session=${token}` }), params({}));
    expect(res.status).toBe(204);
    expect(res.headers.get("set-cookie")).toMatch(/rs_session=;/);
    expect((await validateSessionToken(token)).status).toBe("invalid");
  });

  it("recuperação responde igual para e-mail existente e inexistente", async () => {
    const a = await forgotRoute(apiRequest("/api/v1/auth/password/forgot", { method: "POST", json: { email: "carlos.silva@demo.realseg.invalid" } }), params({}));
    const b = await forgotRoute(apiRequest("/api/v1/auth/password/forgot", { method: "POST", json: { email: "ninguem@demo.realseg.invalid" } }), params({}));
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(await a.json()).toEqual(await b.json());
  });
});
