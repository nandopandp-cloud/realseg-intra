import type { Metadata } from "next";
import { z } from "zod";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { Table, Td, Th, Tr } from "@/components/admin/table";
import { iconFor, ICON_KEYS, toTone, TONE } from "@/components/ui/icons";
import { LinkTabs } from "@/components/ui/navigation";
import { Alert, Badge, Card } from "@/components/ui/primitives";
import { HolidayAdder, HolidayRemove, SlaCellButton, WorkingHoursEditor } from "@/features/rh/settings-editors";
import { EntityDialogButton, type FieldDef } from "@/features/rh/structure-editor";
import { cn } from "@/lib/cn";
import { fmtDate } from "@/lib/format";
import { TICKET_PRIORITIES, TONES } from "@/lib/validation/rh";
import { requireRhCtx } from "@/server/auth/rh";
import { calendarSettings, listTicketCategoriesAdmin, slaMatrix } from "@/server/services/rh/settings";

export const metadata: Metadata = { title: "Configurações · Gestão" };

const params = z.object({ aba: z.enum(["prazos", "areas", "calendario"]).catch("prazos") });
const PRIORITY = { baixa: "Baixa", normal: "Normal", alta: "Alta", urgente: "Urgente" } as const;

export default async function SettingsPage({ searchParams }: PageProps<"/rh/configuracoes">) {
  const ctx = await requireRhCtx("sla:configure");
  const { aba } = params.parse(await searchParams);
  const catFields: FieldDef[] = [
    { name: "name", label: "Nome", kind: "text", required: true, max: 40 },
    { name: "description", label: "Descrição", kind: "text", required: true, max: 80, hint: "Aparece no card da área ao abrir uma solicitação." },
    { name: "color", label: "Cor", kind: "select", required: true, options: TONES.map((t) => ({ value: t, label: t })) },
    { name: "icon", label: "Ícone", kind: "select", required: true, options: ICON_KEYS.map((t) => ({ value: t, label: t })) },
    { name: "defaultPriority", label: "Prioridade padrão", kind: "select", required: true, options: TICKET_PRIORITIES.map((p) => ({ value: p, label: PRIORITY[p] })) },
    { name: "active", label: "Ativa", kind: "switch", hint: "Áreas inativas não aparecem para novas solicitações." },
  ];

  return (
    <AdminPage>
      <AdminPageHeader title="Configurações" description="Prazos de atendimento (SLA), áreas de solicitação e calendário de expediente e feriados." />
      <LinkTabs
        label="Configurações"
        className="mb-5"
        items={[
          { href: "/rh/configuracoes", label: "Prazos de atendimento", active: aba === "prazos" },
          { href: "/rh/configuracoes?aba=areas", label: "Áreas de solicitação", active: aba === "areas" },
          { href: "/rh/configuracoes?aba=calendario", label: "Expediente e feriados", active: aba === "calendario" },
        ]}
      />
      {aba === "prazos" && <Sla ctx={ctx} />}
      {aba === "areas" && (
        <Card className="p-4 sm:p-5">
          <div className="flex justify-end">
            <EntityDialogButton endpoint="/rh/settings/ticket-categories" title="Nova área" label="Nova área" fields={catFields} initial={{ name: "", description: "", color: "teal", icon: "headphones", defaultPriority: "normal", active: true }} />
          </div>
          <Table caption="Áreas de solicitação" className="mt-3">
            <thead>
              <tr>
                <Th>Área</Th>
                <Th>Prioridade padrão</Th>
                <Th>Situação</Th>
                <Th className="w-16">
                  <span className="sr-only">Ações</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {(await listTicketCategoriesAdmin(ctx)).map((c) => {
                const Icon = iconFor(c.icon);
                const tone = toTone(c.color);
                return (
                  <Tr key={c.id}>
                    <Td>
                      <span className="flex items-center gap-3">
                        <span className={cn("inline-flex size-9 items-center justify-center rounded-lg", TONE[tone].tile, TONE[tone].icon)} aria-hidden>
                          <Icon className="size-5" />
                        </span>
                        <span>
                          <span className="block font-semibold">{c.name}</span>
                          <span className="block text-sm text-muted">{c.description}</span>
                        </span>
                      </span>
                    </Td>
                    <Td className="text-sm">{PRIORITY[c.defaultPriority]}</Td>
                    <Td>{c.active ? <Badge tone="green">Ativa</Badge> : <Badge tone="slate">Inativa</Badge>}</Td>
                    <Td>
                      <EntityDialogButton
                        variant="edit"
                        id={c.id}
                        endpoint="/rh/settings/ticket-categories"
                        title={`Editar área: ${c.name}`}
                        label={`Editar ${c.name}`}
                        fields={catFields}
                        initial={{ name: c.name, description: c.description, color: c.color, icon: c.icon, defaultPriority: c.defaultPriority, active: c.active }}
                      />
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}
      {aba === "calendario" && <Calendar ctx={ctx} />}
    </AdminPage>
  );
}

type Ctx = Awaited<ReturnType<typeof requireRhCtx>>;

async function Sla({ ctx }: { ctx: Ctx }) {
  const m = await slaMatrix(ctx);
  return (
    <div className="flex flex-col gap-4">
      <Alert kind="info">Os prazos contam só horas úteis do expediente, sem feriados, e pausam enquanto a solicitação aguarda o colaborador. Uma alteração vale para solicitações abertas daqui em diante; a versão anterior fica no histórico.</Alert>
      <Card className="p-4 sm:p-5">
        <Table caption="Prazos por área e prioridade">
          <thead>
            <tr>
              <Th>Área</Th>
              {TICKET_PRIORITIES.map((p) => (
                <Th key={p}>{PRIORITY[p]}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.rows.map((r) => (
              <Tr key={r.category.id}>
                <Td className="font-semibold">
                  {r.category.name} {!r.category.active && <Badge tone="slate">Inativa</Badge>}
                </Td>
                {r.cells.map((c) => (
                  <Td key={c.priority} className="px-2">
                    <SlaCellButton categoryId={r.category.id} categoryName={r.category.name} priority={c.priority} perDay={m.minutesPerDay} policy={c.policy} />
                  </Td>
                ))}
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

async function Calendar({ ctx }: { ctx: Ctx }) {
  const cal = await calendarSettings(ctx);
  if (!cal) return <Alert kind="warning">Nenhum calendário de atendimento cadastrado.</Alert>;
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card className="p-5">
        <h2 className="text-lg font-bold text-ink">Expediente</h2>
        <p className="mb-3 text-sm text-muted">Fuso: {cal.timezone}. Usado no prazo das solicitações e no “Horário de atendimento” da Ajuda.</p>
        <WorkingHoursEditor initial={cal.workingHours} />
      </Card>
      <Card className="p-5">
        <h2 className="text-lg font-bold text-ink">Feriados</h2>
        <p className="mb-3 text-sm text-muted">Não contam no prazo. Os nacionais já estão cadastrados; inclua os estaduais e municipais das unidades.</p>
        <HolidayAdder />
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
          {cal.holidays.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-3 px-3 py-1.5">
              <span className="text-[0.9375rem]">
                <span className="font-mono text-sm text-muted">{fmtDate(h.date)}</span> {h.name}
              </span>
              <HolidayRemove id={h.id} label={`${fmtDate(h.date)} · ${h.name}`} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
