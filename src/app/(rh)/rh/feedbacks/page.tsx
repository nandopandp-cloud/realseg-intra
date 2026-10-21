import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { MessageSquareHeart, Plus } from "lucide-react";
import { z } from "zod";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { Table, Td, Th, Tr } from "@/components/admin/table";
import { ButtonLink } from "@/components/ui/button";
import { FilterSelect, SearchField } from "@/components/ui/filters";
import { LinkTabs } from "@/components/ui/navigation";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { fmtDate } from "@/lib/format";
import { listHref } from "@/lib/url";
import { requireRhCtx } from "@/server/auth/rh";
import { FEEDBACK_TYPE_LABEL } from "@/server/services/feedbacks";
import { FEEDBACK_TABS, listFeedbacksAdmin } from "@/server/services/rh/feedbacks";

export const metadata: Metadata = { title: "Feedbacks · Gestão" };

const params = z.object({
  aba: z.enum(FEEDBACK_TABS).catch("publicados"),
  q: z.string().max(100).optional().catch(undefined),
  tipo: z.enum(["feedback", "avaliacao", "reconhecimento"]).optional().catch(undefined),
});
const TABS = { publicados: "Publicados", pendentes: "Leitura pendente", rascunhos: "Rascunhos", arquivados: "Arquivados" } as const;
const TONE = { feedback: "blue", avaliacao: "indigo", reconhecimento: "green" } as const;

export default async function AdminFeedbacksPage({ searchParams }: PageProps<"/rh/feedbacks">) {
  const ctx = await requireRhCtx("feedback:write:any");
  const sp = params.parse(await searchParams);
  const { items, counts } = await listFeedbacksAdmin(ctx, { tab: sp.aba, q: sp.q, type: sp.tipo });
  return (
    <AdminPage>
      <AdminPageHeader
        title="Feedbacks"
        description="Reconhecimentos, feedbacks e avaliações registrados para os colaboradores. Cada pessoa lê os seus em Minha carreira › Avaliações e confirma a leitura."
        actions={
          <ButtonLink href="/rh/feedbacks/novo" icon={<Plus className="size-5" aria-hidden />}>
            Registrar feedback
          </ButtonLink>
        }
      />
      <Card className="p-4 sm:p-5">
        <LinkTabs label="Situação" size="sm" items={FEEDBACK_TABS.map((t) => ({ href: listHref("/rh/feedbacks", { aba: sp.aba, q: sp.q, tipo: sp.tipo }, { aba: t }, { aba: "publicados" }), label: TABS[t], count: counts[t], active: sp.aba === t }))} />
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <SearchField label="Buscar feedbacks" placeholder="Colaborador, matrícula ou título" defaultValue={sp.q} hidden={{ aba: sp.aba, tipo: sp.tipo }} className="md:max-w-md md:flex-1" />
          <FilterSelect name="tipo" label="Tipo" options={[{ value: "", label: "Todos os tipos" }, { value: "reconhecimento", label: "Reconhecimento" }, { value: "feedback", label: "Feedback" }, { value: "avaliacao", label: "Avaliação" }]} className="md:w-56" />
        </div>
        {items.length === 0 ? (
          <EmptyState icon={MessageSquareHeart} title="Nenhum feedback nesta lista" className="mt-6" />
        ) : (
          <Table caption="Feedbacks" className="mt-4">
            <thead>
              <tr>
                <Th>Feedback</Th>
                <Th>Colaborador</Th>
                <Th>Autor</Th>
                <Th>Data</Th>
                <Th>Leitura</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((f) => (
                <Tr key={f.id}>
                  <Td className="min-w-[14rem]">
                    <Link href={`/rh/feedbacks/${f.id}`} className="font-semibold hover:underline">
                      {f.title}
                    </Link>
                    <span className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                      <Badge tone={TONE[f.type]}>{FEEDBACK_TYPE_LABEL[f.type]}</Badge>
                      {f.cycle}
                    </span>
                  </Td>
                  <Td>
                    {f.employee.name}
                    <span className="block font-mono text-xs text-muted">{f.employee.registration}</span>
                  </Td>
                  <Td className="text-sm">{f.authorName ?? f.authorContext}</Td>
                  <Td className="text-sm whitespace-nowrap">{fmtDate(f.publishedAt ?? f.updatedAt)}</Td>
                  <Td>{f.status !== "publicado" ? <span className="text-sm text-muted">—</span> : f.acknowledgedAt ? <Badge tone="green">Lido {fmtDate(f.acknowledgedAt)}</Badge> : <Badge tone="amber">Pendente</Badge>}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </AdminPage>
  );
}
