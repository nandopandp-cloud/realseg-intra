import { z } from "zod";

/** Schemas compartilhados entre formulário (cliente) e API (servidor). */
export const loginSchema = z.object({
  identifier: z
    .string({ error: "Informe seu e-mail ou matrícula." })
    .trim()
    .min(3, "Informe seu e-mail ou matrícula.")
    .max(254, "Valor muito longo."),
  password: z.string({ error: "Informe sua senha." }).min(1, "Informe sua senha.").max(200, "Senha muito longa."),
});

export const PASSWORD_RULES = "Use pelo menos 10 caracteres, com letras e números.";

export const newPasswordSchema = z
  .string({ error: "Informe a nova senha." })
  .min(10, "A senha precisa ter pelo menos 10 caracteres.")
  .max(128, "A senha pode ter no máximo 128 caracteres.")
  .refine((v) => /[A-Za-zÀ-ÿ]/.test(v) && /\d/.test(v), "A senha precisa ter letras e números.");

export const forgotPasswordSchema = z.object({
  email: z
    .string({ error: "Informe seu e-mail." })
    .trim()
    .toLowerCase()
    .max(254, "E-mail muito longo.")
    .pipe(z.email("Informe um e-mail válido.")),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20).max(100),
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "As senhas não coincidem." });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual.").max(200),
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "As senhas não coincidem." })
  .refine((v) => v.password !== v.currentPassword, { path: ["password"], message: "A nova senha deve ser diferente da atual." });
