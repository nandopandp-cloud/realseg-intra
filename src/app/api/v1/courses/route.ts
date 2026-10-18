import { z } from "zod";
import { authed } from "@/server/http/route";
import { listCourses } from "@/server/services/courses";

const query = z.object({
  categoria: z.string().max(50).optional(),
  q: z.string().trim().max(100).optional(),
  filtro: z.enum(["todos", "obrigatorios", "em-andamento", "concluidos", "nao-iniciados"]).default("todos"),
});
export const GET = authed({ permission: "course:read", query }, async ({ actor, meta, query }) => ({
  items: await listCourses({ actor, meta }, { category: query.categoria, q: query.q, filter: query.filtro }),
}));
