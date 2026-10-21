import type { Metadata } from "next";
import { z } from "zod";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { Table, Td, Th, Tr } from "@/components/admin/table";
import { LinkTabs } from "@/components/ui/navigation";
import { Badge, Card } from "@/components/ui/primitives";
import { EntityDialogButton, type FieldDef } from "@/features/rh/structure-editor";
import { requireRhCtx } from "@/server/auth/rh";
import { structureOverview } from "@/server/services/rh/org";

export const metadata: Metadata = { title: "Estrutura · Gestão" };

const params = z.object({ aba: z.enum(["areas", "unidades", "cargos"]).catch("areas") });

const ACTIVE: FieldDef = { name: "active", label: "Ativo", kind: "switch", hint: "Inativos não aparecem para novos cadastros. Só é possível desativar sem colaboradores ativos." };

export default async function StructurePage({ searchParams }: PageProps<"/rh/estrutura">) {
  const ctx = await requireRhCtx("employee:manage");
  const { aba } = params.parse(await searchParams);
  const s = await structureOverview(ctx);
  const depFields: FieldDef[] = [
    { name: "code", label: "Código", kind: "text", required: true, max: 20, hint: "Ex.: OPS, RH, TI. Usado na importação por planilha." },
    { name: "name", label: "Nome", kind: "text", required: true, max: 80 },
    { name: "parentId", label: "Área superior", kind: "select", options: s.departments.filter((d) => d.active).map((d) => ({ value: d.id, label: d.name })), emptyLabel: "Nenhuma" },
    ACTIVE,
  ];
  const unitFields: FieldDef[] = [
    { name: "name", label: "Nome", kind: "text", required: true, max: 80 },
    { name: "city", label: "Cidade", kind: "text", required: true, max: 80 },
    { name: "state", label: "UF", kind: "text", required: true, max: 2 },
    ACTIVE,
  ];
  const famFields: FieldDef[] = [
    { name: "name", label: "Nome", kind: "text", required: true, max: 80 },
    { name: "description", label: "Descrição", kind: "textarea", max: 500 },
  ];
  const posFields: FieldDef[] = [
    { name: "title", label: "Cargo", kind: "text", required: true, max: 100 },
    { name: "familyId", label: "Família", kind: "select", required: true, options: s.families.map((f) => ({ value: f.id, label: f.name })) },
    { name: "level", label: "Nível na família", kind: "number", required: true, hint: "1 = inicial. Define a ordem no plano de carreira." },
    { name: "levelLabel", label: "Rótulo do nível", kind: "text", required: true, max: 40, hint: "Ex.: Júnior, Pleno, Sênior, I, II." },
    { name: "description", label: "Descrição", kind: "textarea", max: 1000 },
    { name: "requirements", label: "Requisitos", kind: "textarea", max: 2000 },
    { name: "progressionCriteria", label: "Critérios para progressão", kind: "textarea", max: 2000 },
    ACTIVE,
  ];
  const inactive = <Badge tone="slate">Inativo</Badge>;

  return (
    <AdminPage>
      <AdminPageHeader title="Estrutura" description="Áreas, unidades, famílias profissionais e cargos usados nos cadastros, públicos-alvo e no plano de carreira." />
      <LinkTabs
        label="Cadastros da estrutura"
        className="mb-5"
        items={[
          { href: "/rh/estrutura", label: "Áreas", count: s.departments.length, active: aba === "areas" },
          { href: "/rh/estrutura?aba=unidades", label: "Unidades", count: s.units.length, active: aba === "unidades" },
          { href: "/rh/estrutura?aba=cargos", label: "Famílias e cargos", count: s.positions.length, active: aba === "cargos" },
        ]}
      />
      {aba === "areas" && (
        <Card className="p-4 sm:p-5">
          <div className="flex justify-end">
            <EntityDialogButton endpoint="/rh/org/departments" title="Nova área" label="Nova área" fields={depFields} initial={{ code: "", name: "", parentId: "", active: true }} />
          </div>
          <Table caption="Áreas" className="mt-3">
            <thead>
              <tr>
                <Th>Área</Th>
                <Th>Código</Th>
                <Th>Área superior</Th>
                <Th>Colaboradores</Th>
                <Th className="w-16">
                  <span className="sr-only">Ações</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {s.departments.map((d) => (
                <Tr key={d.id}>
                  <Td className="font-semibold">
                    {d.name} {!d.active && inactive}
                  </Td>
                  <Td className="font-mono text-sm">{d.code}</Td>
                  <Td className="text-sm text-muted">{d.parentName ?? "—"}</Td>
                  <Td className="text-sm">{d.people}</Td>
                  <Td>
                    <EntityDialogButton variant="edit" id={d.id} endpoint="/rh/org/departments" title={`Editar área: ${d.name}`} label={`Editar ${d.name}`} fields={depFields} initial={{ code: d.code, name: d.name, parentId: d.parentId ?? "", active: d.active }} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
      {aba === "unidades" && (
        <Card className="p-4 sm:p-5">
          <div className="flex justify-end">
            <EntityDialogButton endpoint="/rh/org/units" title="Nova unidade" label="Nova unidade" fields={unitFields} initial={{ name: "", city: "", state: "", active: true }} />
          </div>
          <Table caption="Unidades" className="mt-3">
            <thead>
              <tr>
                <Th>Unidade</Th>
                <Th>Cidade</Th>
                <Th>Colaboradores</Th>
                <Th className="w-16">
                  <span className="sr-only">Ações</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {s.units.map((u) => (
                <Tr key={u.id}>
                  <Td className="font-semibold">
                    {u.name} {!u.active && inactive}
                  </Td>
                  <Td className="text-sm">
                    {u.city}/{u.state}
                  </Td>
                  <Td className="text-sm">{u.people}</Td>
                  <Td>
                    <EntityDialogButton variant="edit" id={u.id} endpoint="/rh/org/units" title={`Editar unidade: ${u.name}`} label={`Editar ${u.name}`} fields={unitFields} initial={{ name: u.name, city: u.city, state: u.state, active: u.active }} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
      {aba === "cargos" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap justify-end gap-2">
            <EntityDialogButton endpoint="/rh/org/families" title="Nova família profissional" label="Nova família" fields={famFields} initial={{ name: "", description: "" }} />
            <EntityDialogButton endpoint="/rh/org/positions" title="Novo cargo" label="Novo cargo" fields={posFields} initial={{ title: "", familyId: "", level: 1, levelLabel: "", description: "", requirements: "", progressionCriteria: "", active: true }} />
          </div>
          {s.families.map((f) => (
            <Card key={f.id} className="p-4 sm:p-5" aria-labelledby={`fam-${f.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id={`fam-${f.id}`} className="text-lg font-bold text-ink">
                    {f.name}
                  </h2>
                  {f.description && <p className="text-sm text-muted">{f.description}</p>}
                </div>
                <EntityDialogButton
                  variant="edit"
                  id={f.id}
                  endpoint="/rh/org/families"
                  title={`Editar família: ${f.name}`}
                  label={`Editar família ${f.name}`}
                  fields={famFields}
                  initial={{ name: f.name, description: f.description ?? "" }}
                  deletable={f.positions === 0 ? { confirm: "A família será excluída. Esta ação não pode ser desfeita." } : undefined}
                />
              </div>
              {s.positions.filter((p) => p.familyId === f.id).length === 0 ? (
                <p className="mt-2 text-sm text-muted">Nenhum cargo nesta família.</p>
              ) : (
                <Table caption={`Cargos da família ${f.name}`} className="mt-3">
                  <thead>
                    <tr>
                      <Th className="w-36">Nível</Th>
                      <Th>Cargo</Th>
                      <Th>Colaboradores</Th>
                      <Th className="w-16">
                        <span className="sr-only">Ações</span>
                      </Th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.positions
                      .filter((p) => p.familyId === f.id)
                      .map((p) => (
                        <Tr key={p.id}>
                          <Td className="text-sm whitespace-nowrap">
                            {p.level} · {p.levelLabel}
                          </Td>
                          <Td className="font-semibold">
                            {p.title} {!p.active && inactive}
                          </Td>
                          <Td className="text-sm">{p.people}</Td>
                          <Td>
                            <EntityDialogButton
                              variant="edit"
                              id={p.id}
                              endpoint="/rh/org/positions"
                              title={`Editar cargo: ${p.title}`}
                              label={`Editar ${p.title}`}
                              fields={posFields}
                              initial={{ title: p.title, familyId: p.familyId, level: p.level, levelLabel: p.levelLabel, description: p.description ?? "", requirements: p.requirements ?? "", progressionCriteria: p.progressionCriteria ?? "", active: p.active }}
                            />
                          </Td>
                        </Tr>
                      ))}
                  </tbody>
                </Table>
              )}
            </Card>
          ))}
        </div>
      )}
    </AdminPage>
  );
}
