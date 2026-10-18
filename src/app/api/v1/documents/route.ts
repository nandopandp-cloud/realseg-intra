import { z } from "zod";
import { authed, paginationQuery } from "@/server/http/route";
import { listMyDocuments } from "@/server/services/documents";

const query = z.object({
  q: z.string().trim().max(100).optional(),
  categoria: z.string().max(50).optional(),
  ano: z.coerce.number().int().min(2000).max(2100).optional(),
  status: z.enum(["todos", "pendente", "ciente"]).default("todos"),
  ...paginationQuery,
});

/** Somente documentos pessoais do próprio colaborador (escopo aplicado no SQL). */
export const GET = authed({ permission: "document:read:own", query }, async ({ actor, meta, query }) =>
  listMyDocuments({ actor, meta }, { q: query.q, category: query.categoria, year: query.ano, status: query.status, page: query.page, pageSize: query.pageSize }),
);
