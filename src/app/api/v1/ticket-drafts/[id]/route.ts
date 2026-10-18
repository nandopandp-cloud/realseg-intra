import { ticketDraftSchema } from "@/lib/validation/forms";
import { authed, parseId } from "@/server/http/route";
import { deleteDraft, saveDraft } from "@/server/services/tickets";

export const PUT = authed<{ id: string }, ReturnType<typeof ticketDraftSchema.parse>>({ permission: "ticket:create", body: ticketDraftSchema }, async ({ actor, meta, params, body }) =>
  saveDraft({ actor, meta }, { ...body, id: parseId(params.id, "Rascunho") }),
);
export const DELETE = authed<{ id: string }>({ permission: "ticket:create" }, async ({ actor, meta, params }) => {
  await deleteDraft({ actor, meta }, parseId(params.id, "Rascunho"));
});
