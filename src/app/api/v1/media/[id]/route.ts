import { fileResponse } from "@/server/files/storage";
import { authed, parseId } from "@/server/http/route";
import { openCoverImage } from "@/server/services/rh/media";

/** Imagem de capa enviada pela gestão: só para usuários autenticados e só se estiver em uso como capa. */
export const GET = authed<{ id: string }>({}, async ({ actor, meta, params }) => {
  const asset = await openCoverImage({ actor, meta }, parseId(params.id, "Imagem"));
  const res = await fileResponse(asset, "inline");
  return res;
});
