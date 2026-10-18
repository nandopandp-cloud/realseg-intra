import type { NextRequest } from "next/server";
import { z, ZodError, type ZodType } from "zod";
import { requirePermission, type Actor, type RequestMeta } from "../auth/actor";
import type { Permission } from "../auth/permissions";
import { SESSION_COOKIE, validateSessionToken } from "../auth/session";
import { env } from "../env";
import { AppError, isAppError } from "../errors";
import { logger } from "../logger";
import { requestMeta } from "./meta";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export type ErrorBody = { error: { code: string; message: string; details?: Record<string, string[]>; requestId: string } };

export function errorResponse(err: AppError, requestId: string): Response {
  const body: ErrorBody = { error: { code: err.code, message: err.message, details: err.details, requestId } };
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (err.retryAfterSeconds) headers["Retry-After"] = String(err.retryAfterSeconds);
  return Response.json(body, { status: err.status, headers });
}

export function zodDetails(error: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/** CSRF: requisições que alteram estado precisam de Origin igual à aplicação (cookies SameSite=Lax completam a defesa). */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const allowed = new Set([new URL(env().APP_URL).origin]);
  if (env().APP_ENV !== "production") allowed.add(new URL(req.url).origin);
  if (!origin || !allowed.has(origin)) {
    throw new AppError("CSRF_REJECTED", "Origem da requisição não permitida.");
  }
}

type HandlerCtx<B, Q, P> = {
  req: NextRequest;
  body: B;
  query: Q;
  params: P;
  meta: RequestMeta;
};

type Options<B, Q> = {
  permission?: Permission;
  body?: ZodType<B>;
  query?: ZodType<Q>;
};

type RouteContext<P> = { params: Promise<P> };

function toResponse(result: unknown): Response {
  if (result instanceof Response) return result;
  if (result === undefined) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
}

async function parseInput<B, Q>(req: NextRequest, opts: Options<B, Q>) {
  let body = undefined as B;
  let query = undefined as Q;
  if (opts.query) {
    query = opts.query.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  }
  if (opts.body) {
    const type = req.headers.get("content-type") ?? "";
    if (!type.includes("application/json")) throw new AppError("VALIDATION_ERROR", "Envie os dados em JSON.");
    const raw = await req.json().catch(() => {
      throw new AppError("VALIDATION_ERROR", "JSON inválido.");
    });
    body = opts.body.parse(raw);
  }
  return { body, query };
}

async function run(req: NextRequest, meta: RequestMeta, fn: () => Promise<unknown>): Promise<Response> {
  const started = Date.now();
  try {
    if (MUTATING.has(req.method)) assertSameOrigin(req);
    const res = toResponse(await fn());
    res.headers.set("x-request-id", meta.requestId);
    logger.info("http.request", { method: req.method, path: req.nextUrl.pathname, status: res.status, ms: Date.now() - started, requestId: meta.requestId });
    return res;
  } catch (err) {
    let appErr: AppError;
    if (isAppError(err)) appErr = err;
    else if (err instanceof ZodError) appErr = new AppError("VALIDATION_ERROR", "Verifique os campos informados.", { details: zodDetails(err) });
    else {
      logger.error("http.unhandled_error", { err, method: req.method, path: req.nextUrl.pathname, requestId: meta.requestId });
      appErr = new AppError("INTERNAL", "Não foi possível concluir agora. Tente novamente em instantes.");
    }
    if (appErr.status >= 400 && appErr.status < 500) {
      logger.info("http.request", { method: req.method, path: req.nextUrl.pathname, status: appErr.status, code: appErr.code, requestId: meta.requestId });
    }
    return errorResponse(appErr, meta.requestId);
  }
}

/** Rota autenticada: sessão válida obrigatória (+ permissão opcional). */
export function authed<P = Record<string, string>, B = undefined, Q = undefined>(
  opts: Options<B, Q>,
  handler: (ctx: HandlerCtx<B, Q, P> & { actor: Actor }) => Promise<unknown>,
) {
  return async (req: NextRequest, context: RouteContext<P>) => {
    const meta = requestMeta(req.headers);
    return run(req, meta, async () => {
      const token = req.cookies.get(SESSION_COOKIE)?.value;
      if (!token) throw new AppError("UNAUTHENTICATED", "Faça login para continuar.");
      const result = await validateSessionToken(token);
      if (result.status === "expired") throw new AppError("SESSION_EXPIRED", "Sua sessão expirou. Entre novamente.");
      if (result.status !== "valid") throw new AppError("UNAUTHENTICATED", "Faça login para continuar.");
      if (opts.permission) requirePermission(result.actor, opts.permission);
      const { body, query } = await parseInput(req, opts);
      const params = (await context?.params) ?? ({} as P);
      return handler({ req, body, query, params, meta, actor: result.actor });
    });
  };
}

/** Rota pública (login, recuperação de senha). Ainda aplica CSRF e validação. */
export function publicRoute<P = Record<string, string>, B = undefined, Q = undefined>(
  opts: Omit<Options<B, Q>, "permission">,
  handler: (ctx: HandlerCtx<B, Q, P>) => Promise<unknown>,
) {
  return async (req: NextRequest, context: RouteContext<P>) => {
    const meta = requestMeta(req.headers);
    return run(req, meta, async () => {
      const { body, query } = await parseInput(req, opts);
      const params = (await context?.params) ?? ({} as P);
      return handler({ req, body, query, params, meta });
    });
  };
}

/** IDs inválidos respondem 404 (mesma resposta de recurso inexistente/sem acesso). */
export function parseId(value: string | undefined, what = "Registro"): string {
  const r = z.uuid().safeParse(value);
  if (!r.success) throw new AppError("NOT_FOUND", `${what} não encontrado.`);
  return r.data;
}
export const paginationQuery = {
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
};
