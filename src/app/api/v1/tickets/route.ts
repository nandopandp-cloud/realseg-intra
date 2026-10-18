import { z } from "zod";
import { ticketCreateSchema } from "@/lib/validation/forms";
import { authed, paginationQuery } from "@/server/http/route";
import { readMultipart } from "@/server/http/multipart";
import { createTicket, listMyTickets } from "@/server/services/tickets";

const query = z.object({
  aba: z.enum(["todos", "andamento", "aguardando", "respondidos", "concluidos"]).default("todos"),
  q: z.string().trim().max(100).optional(),
  categoria: z.string().max(50).optional(),
  ...paginationQuery,
});

export const GET = authed({ permission: "ticket:read:own", query }, async ({ actor, meta, query }) =>
  listMyTickets({ actor, meta }, { tab: query.aba, q: query.q, category: query.categoria, page: query.page, pageSize: query.pageSize }),
);

/** Abre solicitação (multipart: categorySlug, subject, description, draftId? + até 5 anexos em "files"). */
export const POST = authed({ permission: "ticket:create" }, async ({ actor, meta, req }) => {
  const { fields, files } = await readMultipart(req, { maxFiles: 5 });
  const data = ticketCreateSchema.parse(fields);
  const created = await createTicket({ actor, meta }, { ...data, files });
  return Response.json(created, { status: 201, headers: { "Cache-Control": "no-store" } });
});
