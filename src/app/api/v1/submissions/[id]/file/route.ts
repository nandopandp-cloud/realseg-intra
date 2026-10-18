import { fileResponse } from "@/server/files/storage";
import { authed, parseId } from "@/server/http/route";
import { openSubmissionFile } from "@/server/services/documents";

export const GET = authed<{ id: string }>({ permission: "document:submit:own" }, async ({ actor, meta, params, req }) => {
  const asset = await openSubmissionFile({ actor, meta }, parseId(params.id, "Envio"));
  return fileResponse(asset, req.nextUrl.searchParams.get("disposition") === "inline" ? "inline" : "attachment");
});
