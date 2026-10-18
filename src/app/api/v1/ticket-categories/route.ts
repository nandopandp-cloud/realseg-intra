import { authed } from "@/server/http/route";
import { listTicketCategories } from "@/server/services/tickets";

export const GET = authed({ permission: "ticket:create" }, async () => ({ items: await listTicketCategories() }));
