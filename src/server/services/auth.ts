import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { z } from "zod";
import type { changePasswordSchema, loginSchema, resetPasswordSchema } from "@/lib/validation/auth";
import { audit } from "../audit";
import type { Ctx, RequestMeta } from "../auth/actor";
import { generateToken, getDummyHash, hashPassword, sha256Hex, verifyPassword } from "../auth/crypto";
import { createSession, revokeAllSessions, revokeSession } from "../auth/session";
import { getDb } from "../db/client";
import { employees, passwordResetTokens, users } from "../db/schema";
import { env } from "../env";
import { AppError, validation } from "../errors";
import { logger } from "../logger";
import { getMailer } from "../mail";
import * as rateLimit from "../rate-limit";

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;
const RESET_TOKEN_MINUTES = 30;
const LOCKED_MESSAGE = `Muitas tentativas sem sucesso. Aguarde ${LOCK_MINUTES} minutos ou use "Esqueci minha senha".`;
const INVALID_MESSAGE = "E-mail/matrícula ou senha incorretos.";

async function findUserByIdentifier(identifier: string) {
  const db = getDb();
  const value = identifier.trim();
  if (value.includes("@")) {
    const [u] = await db.select().from(users).where(sql`lower(${users.email}) = lower(${value})`).limit(1);
    return u;
  }
  const [row] = await db
    .select({ user: users })
    .from(employees)
    .innerJoin(users, eq(users.id, employees.userId))
    .where(eq(employees.registrationNumber, value))
    .limit(1);
  return row?.user;
}

export async function login(input: z.infer<typeof loginSchema>, meta: RequestMeta) {
  const identifierKey = sha256Hex(input.identifier.trim().toLowerCase());
  // Limite por IP conta todas as tentativas; limite por identificador conta apenas falhas.
  if (meta.ipHash) await rateLimit.enforce(`login:ip:${meta.ipHash}`, 30, 15 * 60);
  const idState = await rateLimit.peek(`login:id:${identifierKey}`, MAX_FAILURES);
  if (!idState.allowed) throw new AppError("RATE_LIMITED", LOCKED_MESSAGE);

  const user = await findUserByIdentifier(input.identifier);
  const passwordOk = await verifyPassword(input.password, user?.passwordHash ?? (await getDummyHash()));
  const db = getDb();

  if (user && user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    await audit({ action: "auth.login_failed", actorUserId: user.id, entityType: "user", entityId: user.id, metadata: { reason: "locked" }, meta });
    throw new AppError("RATE_LIMITED", LOCKED_MESSAGE);
  }

  if (!user || !passwordOk || user.status !== "active" || user.deletedAt) {
    await rateLimit.hit(`login:id:${identifierKey}`, MAX_FAILURES, LOCK_MINUTES * 60);
    if (user) {
      const failures = user.failedLoginCount + 1;
      await db
        .update(users)
        .set({
          failedLoginCount: failures,
          lockedUntil: failures >= MAX_FAILURES ? new Date(Date.now() + LOCK_MINUTES * 60_000) : user.lockedUntil,
        })
        .where(eq(users.id, user.id));
      await audit({
        action: "auth.login_failed",
        actorUserId: user.id,
        entityType: "user",
        entityId: user.id,
        metadata: { reason: user.status !== "active" ? "inactive" : "bad_password", failures },
        meta,
      });
    } else {
      await audit({ action: "auth.login_failed", actorUserId: null, entityType: "user", metadata: { reason: "unknown_identifier" }, meta });
    }
    throw new AppError("INVALID_CREDENTIALS", INVALID_MESSAGE);
  }

  await db.update(users).set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await rateLimit.reset(`login:id:${identifierKey}`);
  const session = await createSession(user.id, meta);
  await audit({ action: "auth.login_succeeded", actorUserId: user.id, entityType: "user", entityId: user.id, meta });
  return { ...session, mustChangePassword: user.mustChangePassword };
}

export async function logout(ctx: Ctx) {
  await revokeSession(ctx.actor.sessionId);
  await audit({ action: "auth.logout", actorUserId: ctx.actor.userId, entityType: "user", entityId: ctx.actor.userId, meta: ctx.meta });
}

/**
 * Sempre responde da mesma forma (não revela se o e-mail existe).
 * Gera token de uso único com validade curta; somente o hash é persistido.
 */
export async function requestPasswordReset(email: string, meta: RequestMeta) {
  if (meta.ipHash) await rateLimit.enforce(`reset:ip:${meta.ipHash}`, 10, 60 * 60);
  await rateLimit.enforce(`reset:email:${sha256Hex(email.toLowerCase())}`, 3, 60 * 60);
  const db = getDb();
  const [user] = await db
    .select({ id: users.id, email: users.email, status: users.status })
    .from(users)
    .where(and(sql`lower(${users.email}) = lower(${email})`, isNull(users.deletedAt)))
    .limit(1);

  if (!user || user.status !== "active") {
    await audit({ action: "auth.password_reset_requested", actorUserId: null, entityType: "user", metadata: { matched: false }, meta });
    return;
  }

  const token = generateToken(32);
  await db.transaction(async (tx) => {
    // Invalida tokens anteriores ainda não usados.
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));
    await tx.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash: sha256Hex(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_MINUTES * 60_000),
    });
  });

  const link = `${env().APP_URL}/redefinir-senha?token=${encodeURIComponent(token)}`;
  try {
    const mailer = await getMailer();
    await mailer.send({
      to: user.email,
      subject: "Redefinição de senha — Intranet REALSEG",
      text: [
        "Recebemos um pedido para redefinir a senha da sua conta na Intranet REALSEG.",
        "",
        `Para criar uma nova senha, acesse: ${link}`,
        "",
        `O link é válido por ${RESET_TOKEN_MINUTES} minutos e pode ser usado uma única vez.`,
        "Se você não fez este pedido, ignore este e-mail — sua senha continua a mesma.",
      ].join("\n"),
    });
  } catch (err) {
    logger.error("mail.send_failed", { err, requestId: meta.requestId });
  }
  await audit({ action: "auth.password_reset_requested", actorUserId: user.id, entityType: "user", entityId: user.id, metadata: { matched: true }, meta });
}

export async function resetPassword(input: z.infer<typeof resetPasswordSchema>, meta: RequestMeta) {
  if (meta.ipHash) await rateLimit.enforce(`reset-submit:ip:${meta.ipHash}`, 20, 60 * 60);
  const db = getDb();
  const tokenHash = sha256Hex(input.token);
  const passwordHash = await hashPassword(input.password);

  const userId = await db.transaction(async (tx) => {
    // UPDATE condicional garante uso único mesmo com requisições concorrentes.
    const [consumed] = await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      )
      .returning({ userId: passwordResetTokens.userId });
    if (!consumed) return null;
    await tx
      .update(users)
      .set({ passwordHash, passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null, mustChangePassword: false })
      .where(eq(users.id, consumed.userId));
    await revokeAllSessions(consumed.userId, undefined, tx);
    return consumed.userId;
  });

  if (!userId) {
    throw new AppError("VALIDATION_ERROR", "Este link de redefinição é inválido ou expirou. Solicite um novo.");
  }
  await audit({ action: "auth.password_reset_completed", actorUserId: userId, entityType: "user", entityId: userId, meta });
}

export async function changePassword(ctx: Ctx, input: z.infer<typeof changePasswordSchema>) {
  await rateLimit.enforce(`change-password:user:${ctx.actor.userId}`, 5, 15 * 60);
  const db = getDb();
  const [user] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, ctx.actor.userId));
  if (!user || !(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw validation("Verifique os campos.", { currentPassword: ["Senha atual incorreta."] });
  }
  const passwordHash = await hashPassword(input.password);
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash, passwordChangedAt: new Date(), mustChangePassword: false })
      .where(eq(users.id, ctx.actor.userId));
    // Encerra as demais sessões (outros dispositivos), mantendo a atual.
    await revokeAllSessions(ctx.actor.userId, ctx.actor.sessionId, tx);
  });
  await audit({ action: "auth.password_changed", actorUserId: ctx.actor.userId, entityType: "user", entityId: ctx.actor.userId, meta: ctx.meta });
}
