import type { z } from "zod";
import { importSchema } from "@/lib/validation/rh";
import { authed } from "@/server/http/route";
import { importEmployees } from "@/server/services/rh/employees";

/** Importação por CSV: `dryRun` valida e mostra o resultado linha a linha sem gravar. */
export const POST = authed<Record<string, string>, z.infer<typeof importSchema>>({ permission: "employee:manage", body: importSchema }, async ({ actor, meta, body }) => importEmployees({ actor, meta }, body.csv, { dryRun: body.dryRun }));
