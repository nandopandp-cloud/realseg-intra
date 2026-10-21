import { fileResponse } from "@/server/files/storage";
import { authed, parseId } from "@/server/http/route";
import { openSubmissionFileAdmin } from "@/server/services/rh/documents";

export const GET = authed<{ id: string }>({ permission: "submission:review" }, async ({ actor, meta, params, req }) => {
  const asset = await openSubmissionFileAdmin({ actor, meta }, parseId(params.id, "Envio"));
  return fileResponse(asset, req.nextUrl.searchParams.get("disposition") === "inline" ? "inline" : "attachment");
});
