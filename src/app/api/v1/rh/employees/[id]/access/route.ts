import type { z } from "zod";
import { accessResetSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { resetEmployeeAccess } from "@/server/services/rh/employees";

/** Novo acesso (senha temporária exibida uma única vez, ou convite por e-mail) e desbloqueio. */
export const POST = authed<{ id: string }, z.infer<typeof accessResetSchema>>({ permission: "employee:manage", body: accessResetSchema }, async ({ actor, meta, params, body }) =>
  resetEmployeeAccess({ actor, meta }, parseId(params.id, "Colaborador"), body.mode),
);
