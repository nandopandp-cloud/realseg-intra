/**
 * Logger estruturado (JSON por linha) com redação de campos sensíveis.
 * Nunca registre conteúdo de documentos, senhas, tokens, e-mails ou mensagens de tickets.
 */
type Level = "debug" | "info" | "warn" | "error";
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const SENSITIVE = /pass(word)?|senha|token|secret|cookie|authorization|email|cpf|body|content|message|description/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack?.split("\n").slice(0, 6).join("\n") };
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = SENSITIVE.test(k) && k !== "err" ? "[redacted]" : redact(v, depth + 1);
  }
  return out;
}

function threshold(): number {
  const lvl = (process.env.LOG_LEVEL as Level | undefined) ?? "info";
  return ORDER[lvl] ?? ORDER.info;
}

function write(level: Level, msg: string, data?: Record<string, unknown>) {
  if (ORDER[level] < threshold()) return;
  if (process.env.NODE_ENV === "test" && level !== "error" && !process.env.LOG_IN_TESTS) return;
  const line = JSON.stringify({ level, time: new Date().toISOString(), msg, ...(redact(data ?? {}) as object) });
  if (level === "error" || level === "warn") process.stderr.write(line + "\n");
  else process.stdout.write(line + "\n");
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => write("debug", msg, data),
  info: (msg: string, data?: Record<string, unknown>) => write("info", msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => write("warn", msg, data),
  error: (msg: string, data?: Record<string, unknown>) => write("error", msg, data),
};
