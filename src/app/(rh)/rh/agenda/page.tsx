import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { z } from "zod";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { Table, Td, Th, Tr } from "@/components/admin/table";
import { LinkTabs } from "@/components/ui/navigation";
import { Card, EmptyState } from "@/components/ui/primitives";
import { EventDialogButton } from "@/features/rh/help-and-agenda";
import { fmtDateTime } from "@/lib/format";
import { requireRhCtx } from "@/server/auth/rh";
import { announcementLinkOptions, EVENT_TABS, listEventsAdmin } from "@/server/services/rh/events";
import { orgOptions } from "@/server/services/rh/org";

export const metadata: Metadata = { title: "Agenda · Gestão" };

const params = z.object({ aba: z.enum(EVENT_TABS).catch("proximos") });
const TABS = { proximos: "Próximos", passados: "Realizados", cancelados: "Cancelados" } as const;
/** Instante → "YYYY-MM-DDTHH:mm" no horário de Brasília (campo datetime-local). */
const local = (d: Date | null) => (d ? new Date(d.getTime() - 3 * 3600_000).toISOString().slice(0, 16) : "");

export default async function AgendaPage({ searchParams }: PageProps<"/rh/agenda">) {
  const ctx = await requireRhCtx("announcement:manage");
  const { aba } = params.parse(await searchParams);
  const [items, org, anns] = await Promise.all([listEventsAdmin(ctx, aba), orgOptions(ctx), announcementLinkOptions()]);
  return (
    <AdminPage>
      <AdminPageHeader title="Agenda" description="Eventos exibidos em “Próximos eventos” na Home e em Comunicados, para todas as unidades ou para uma unidade." actions={<EventDialogButton units={org.units} announcements={anns} />} />
      <Card className="p-4 sm:p-5">
        <LinkTabs label="Período" size="sm" items={EVENT_TABS.map((t) => ({ href: t === "proximos" ? "/rh/agenda" : `/rh/agenda?aba=${t}`, label: TABS[t], active: aba === t }))} />
        {items.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Nenhum evento nesta lista" className="mt-6" />
        ) : (
          <Table caption="Eventos" className="mt-4">
            <thead>
              <tr>
                <Th>Evento</Th>
                <Th>Quando</Th>
                <Th>Unidade</Th>
                <Th className="w-28">
                  <span className="sr-only">Ações</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <Tr key={e.id}>
                  <Td className="min-w-[14rem]">
                    <span className="block font-semibold">{e.title}</span>
                    <span className="block text-sm text-muted">
                      {e.location ?? "Local a definir"}
                      {e.announcementTitle ? ` · ${e.announcementTitle}` : ""}
                    </span>
                  </Td>
                  <Td className="text-sm whitespace-nowrap">
                    {fmtDateTime(e.startsAt)}
                    {e.endsAt ? <span className="block text-muted">até {fmtDateTime(e.endsAt)}</span> : null}
                  </Td>
                  <Td className="text-sm">{e.unitName ?? "Todas"}</Td>
                  <Td>
                    <EventDialogButton
                      units={org.units}
                      announcements={anns}
                      event={{ id: e.id, title: e.title, description: e.description ?? "", location: e.location ?? "", start: local(e.startsAt), end: local(e.endsAt), unitId: e.unitId ?? "", announcementId: e.announcementId ?? "", status: e.status }}
                    />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </AdminPage>
  );
}
