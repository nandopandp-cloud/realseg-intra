import type { z } from "zod";
import { batchPreviewSchema } from "@/lib/validation/rh";
import { authed } from "@/server/http/route";
import { matchBatchFiles } from "@/server/services/rh/documents";

/** Prévia do lote: associa cada nome de arquivo a um colaborador pela matrícula. Nenhum arquivo é enviado aqui. */
export const POST = authed<Record<string, string>, z.infer<typeof batchPreviewSchema>>({ permission: "document:manage", body: batchPreviewSchema }, async ({ actor, meta, body }) => ({
  items: await matchBatchFiles({ actor, meta }, body.names),
}));
