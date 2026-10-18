import { randomUUID } from "node:crypto";
import type { RequestMeta } from "../auth/actor";
import { hashIp } from "../auth/crypto";
import { env } from "../env";

type HeaderSource = { get(name: string): string | null };

export function clientIp(headers: HeaderSource): string | null {
  if (env().TRUST_PROXY) {
    const fwd = headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    const real = headers.get("x-real-ip");
    if (real) return real.trim();
  }
  // Sem proxy confiável não há IP verificável (cabeçalhos seriam forjáveis): limites por IP são ignorados.
  return null;
}

const safeRequestId = (v: string | null) => (v && /^[A-Za-z0-9_-]{8,64}$/.test(v) ? v : null);

export function requestMeta(headers: HeaderSource): RequestMeta {
  return {
    requestId: safeRequestId(headers.get("x-request-id")) ?? randomUUID(),
    ipHash: hashIp(clientIp(headers), env().IP_HASH_SECRET),
    userAgent: headers.get("user-agent")?.slice(0, 200) ?? null,
  };
}
