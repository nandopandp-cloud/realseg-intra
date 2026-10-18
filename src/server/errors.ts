export type ErrorCode =
  | "UNAUTHENTICATED"
  | "SESSION_EXPIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "INVALID_TRANSITION"
  | "RATE_LIMITED"
  | "INVALID_CREDENTIALS"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_FILE"
  | "CSRF_REJECTED"
  | "INTERNAL";

const STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  SESSION_EXPIRED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  CONFLICT: 409,
  INVALID_TRANSITION: 409,
  RATE_LIMITED: 429,
  INVALID_CREDENTIALS: 401,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_FILE: 415,
  CSRF_REJECTED: 403,
  INTERNAL: 500,
};

/** Erro de domínio com mensagem segura para exibir ao usuário (pt-BR, sem detalhes internos). */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: Record<string, string[]>;
  readonly retryAfterSeconds?: number;

  constructor(code: ErrorCode, message: string, opts?: { details?: Record<string, string[]>; retryAfterSeconds?: number }) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS[code];
    this.details = opts?.details;
    this.retryAfterSeconds = opts?.retryAfterSeconds;
  }
}

export const notFound = (what = "Registro") => new AppError("NOT_FOUND", `${what} não encontrado.`);
export const forbidden = () => new AppError("FORBIDDEN", "Você não tem permissão para realizar esta ação.");
export const unauthenticated = () => new AppError("UNAUTHENTICATED", "Faça login para continuar.");
export const validation = (message: string, details?: Record<string, string[]>) =>
  new AppError("VALIDATION_ERROR", message, { details });
export const conflict = (message: string) => new AppError("CONFLICT", message);
export const invalidTransition = (message: string) => new AppError("INVALID_TRANSITION", message);

export const isAppError = (e: unknown): e is AppError => e instanceof AppError;
