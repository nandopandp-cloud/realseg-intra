import { z } from "zod";

/** Schemas compartilhados cliente/servidor (o servidor sempre revalida). */
export const ticketCreateSchema = z.object({
  categorySlug: z.string({ error: "Escolha uma categoria." }).min(1, "Escolha uma categoria.").max(50),
  subject: z.string({ error: "Informe o assunto." }).trim().min(4, "O assunto precisa ter pelo menos 4 caracteres.").max(120, "Use no máximo 120 caracteres."),
  description: z.string({ error: "Descreva o que você precisa." }).trim().min(10, "Descreva com pelo menos 10 caracteres.").max(5000, "Use no máximo 5.000 caracteres."),
  draftId: z.uuid().optional(),
});

export const ticketMessageSchema = z.object({
  body: z.string({ error: "Escreva sua mensagem." }).trim().min(1, "Escreva sua mensagem.").max(5000, "Use no máximo 5.000 caracteres."),
});

export const ticketDraftSchema = z.object({
  categorySlug: z.string().max(50).optional(),
  subject: z.string().trim().max(120, "Use no máximo 120 caracteres.").default(""),
  description: z.string().trim().max(5000, "Use no máximo 5.000 caracteres.").default(""),
});

export const submissionCreateSchema = z.object({
  categorySlug: z.string({ error: "Escolha o tipo de documento." }).min(1, "Escolha o tipo de documento.").max(50),
  title: z.string({ error: "Dê um nome ao documento." }).trim().min(3, "Use pelo menos 3 caracteres.").max(120, "Use no máximo 120 caracteres."),
  notes: z.string().trim().max(1000, "Use no máximo 1.000 caracteres.").optional(),
  referenceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
    .refine((v) => !Number.isNaN(Date.parse(v)) && new Date(v) <= new Date(Date.now() + 86400_000), "A data não pode estar no futuro.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const opportunityApplySchema = z.object({
  message: z.string().trim().max(1000, "Use no máximo 1.000 caracteres.").optional(),
});

export const UPLOAD_ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
export const UPLOAD_HINT = "PDF, JPG ou PNG, até 10 MB.";
