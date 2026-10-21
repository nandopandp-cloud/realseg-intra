import type { z } from "zod";
import { workingHoursSchema } from "@/lib/validation/rh";
import { authed } from "@/server/http/route";
import { saveWorkingHours } from "@/server/services/rh/settings";
import type { WorkingHours } from "@/server/db/schema";

export const PUT = authed<Record<string, string>, z.infer<typeof workingHoursSchema>>({ permission: "sla:configure", body: workingHoursSchema }, async ({ actor, meta, body }) => {
  await saveWorkingHours({ actor, meta }, body.workingHours as WorkingHours);
});
