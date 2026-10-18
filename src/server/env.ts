import "server-only";
import { z } from "zod";

const bool = z
  .enum(["true", "false", "1", "0"])
  .default("false")
  .transform((v) => v === "true" || v === "1");

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
    APP_URL: z.url().default("http://localhost:3000"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatório"),
    SESSION_ABSOLUTE_HOURS: z.coerce.number().int().min(1).max(72).default(12),
    SESSION_IDLE_MINUTES: z.coerce.number().int().min(5).max(24 * 60).default(60),
    IP_HASH_SECRET: z.string().min(16, "IP_HASH_SECRET deve ter ao menos 16 caracteres"),
    TRUST_PROXY: bool,
    STORAGE_DIR: z.string().default(".data/storage"),
    UPLOAD_MAX_MB: z.coerce.number().int().min(1).max(50).default(10),
    MAIL_DRIVER: z.enum(["outbox", "smtp"]).default("outbox"),
    MAIL_FROM: z.string().default("Intranet REALSEG <nao-responda@realseg.com.br>"),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().default(587),
    SMTP_SECURE: bool,
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  })
  .superRefine((env, ctx) => {
    if (env.APP_ENV === "production") {
      if (env.MAIL_DRIVER !== "smtp") {
        ctx.addIssue({ code: "custom", path: ["MAIL_DRIVER"], message: "Produção exige MAIL_DRIVER=smtp (ADR-0008)." });
      }
      if (env.IP_HASH_SECRET.startsWith("troque")) {
        ctx.addIssue({ code: "custom", path: ["IP_HASH_SECRET"], message: "Defina um segredo real em produção." });
      }
      if (!env.APP_URL.startsWith("https://")) {
        ctx.addIssue({ code: "custom", path: ["APP_URL"], message: "Produção exige APP_URL com https." });
      }
    }
    if (env.MAIL_DRIVER === "smtp" && !env.SMTP_HOST) {
      ctx.addIssue({ code: "custom", path: ["SMTP_HOST"], message: "SMTP_HOST é obrigatório com MAIL_DRIVER=smtp." });
    }
  });

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Configuração de ambiente inválida — ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export const isProductionEnv = () => env().APP_ENV === "production";
