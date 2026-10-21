import type { Metadata } from "next";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { EMPTY_OPPORTUNITY, OpportunityForm } from "@/features/rh/career/career-forms";
import { requireRhCtx } from "@/server/auth/rh";
import { orgOptions } from "@/server/services/rh/org";

export const metadata: Metadata = { title: "Nova oportunidade · Gestão" };

export default async function NewOpportunityPage() {
  const ctx = await requireRhCtx("career:manage");
  const org = await orgOptions(ctx);
  return (
    <AdminPage>
      <AdminPageHeader title="Nova oportunidade" crumbs={[{ label: "Carreira", href: "/rh/carreira" }]} description="Começa como rascunho; publique quando estiver pronta." />
      <OpportunityForm initial={EMPTY_OPPORTUNITY} org={org} />
    </AdminPage>
  );
}
