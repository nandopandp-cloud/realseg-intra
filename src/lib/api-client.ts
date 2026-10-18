"use client";

/** Erro padronizado da API (`{ error: { code, message, details } }`). */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, string[]>,
  ) {
    super(message);
  }
}

type Options = { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; json?: unknown; formData?: FormData; signal?: AbortSignal };

/**
 * Cliente da API /api/v1. Sessão expirada redireciona para o login preservando a página atual.
 * Falha de rede vira mensagem compreensível.
 */
export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      method: opts.method ?? (opts.json || opts.formData ? "POST" : "GET"),
      headers: opts.json !== undefined ? { "content-type": "application/json" } : undefined,
      body: opts.formData ?? (opts.json !== undefined ? JSON.stringify(opts.json) : undefined),
      credentials: "same-origin",
      signal: opts.signal,
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Sem conexão com o servidor. Verifique sua internet e tente novamente.");
  }

  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = body?.error;
    if (res.status === 401 && (err?.code === "SESSION_EXPIRED" || err?.code === "UNAUTHENTICATED")) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      // Fora do ciclo de render do React (helper genérico): recarga completa para a tela de login.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/login?motivo=${err.code === "SESSION_EXPIRED" ? "sessao-expirada" : "entrar"}&next=${next}`);
    }
    throw new ApiError(res.status, err?.code ?? "INTERNAL", err?.message ?? "Não foi possível concluir agora. Tente novamente.", err?.details);
  }
  return body as T;
}

/** Primeiro erro por campo (para exibir junto ao controle). */
export function fieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError) || !err.details) return {};
  return Object.fromEntries(Object.entries(err.details).map(([k, v]) => [k, v[0]]));
}
