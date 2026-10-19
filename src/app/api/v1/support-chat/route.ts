import { chatStartSchema } from "@/lib/validation/forms";
import { authed } from "@/server/http/route";
import { activeChatNumber, startChat } from "@/server/services/tickets";

/** Conversa de chat em aberto do colaborador (`{ number }` ou `{ number: null }`). */
export const GET = authed({ permission: "ticket:read:own" }, async ({ actor, meta }) => ({ number: await activeChatNumber({ actor, meta }) }));

/** Inicia conversa pelo chat de suporte (vira solicitação com canal "chat"); se já houver uma aberta, a mensagem entra nela. */
export const POST = authed({ permission: "ticket:create", body: chatStartSchema }, async ({ actor, meta, body }) => {
  const r = await startChat({ actor, meta }, body);
  return Response.json(r, { status: r.resumed ? 200 : 201, headers: { "Cache-Control": "no-store" } });
});
