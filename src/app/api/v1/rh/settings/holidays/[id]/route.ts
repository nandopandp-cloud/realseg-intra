import { authed, parseId } from "@/server/http/route";
import { deleteHoliday } from "@/server/services/rh/settings";

export const DELETE = authed<{ id: string }>({ permission: "sla:configure" }, async ({ actor, meta, params }) => {
  await deleteHoliday({ actor, meta }, parseId(params.id, "Feriado"));
});
