import { z } from "zod";
import { authed, paginationQuery } from "@/server/http/route";
import { listAnnouncements } from "@/server/services/announcements";

const query = z.object({
  aba: z.enum(["todos", "importantes", "nao-lidos", "favoritos"]).default("todos"),
  q: z.string().trim().max(100).optional(),
  categoria: z.string().max(50).optional(),
  ordem: z.enum(["recentes", "antigos"]).default("recentes"),
  ...paginationQuery,
});

export const GET = authed({ permission: "announcement:read", query }, async ({ actor, meta, query }) =>
  listAnnouncements({ actor, meta }, { tab: query.aba, q: query.q, category: query.categoria, sort: query.ordem, page: query.page, pageSize: query.pageSize }),
);
