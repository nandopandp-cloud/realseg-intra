import type { Metadata } from "next";
import { z } from "zod";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { FeedbackForm } from "@/features/rh/feedback-form";
import { requireRhCtx } from "@/server/auth/rh";
import { employeeBrief } from "@/server/services/rh/employee-search";

export const metadata: Metadata = { title: "Registrar feedback · Gestão" };

const params = z.object({ colaborador: z.uuid().optional().catch(undefined) });

export default async function NewFeedbackPage({ searchParams }: PageProps<"/rh/feedbacks/novo">) {
  const ctx = await requireRhCtx("feedback:write:any");
  const { colaborador } = params.parse(await searchParams);
  const emp = colaborador ? await employeeBrief(ctx, colaborador) : null;
  return (
    <AdminPage>
      <AdminPageHeader title="Registrar feedback" crumbs={[{ label: "Feedbacks", href: "/rh/feedbacks" }]} description="Salve como rascunho ou publique. O colaborador recebe um aviso, sem o conteúdo, e confirma a leitura." />
      <FeedbackForm initial={{ employee: emp, type: "reconhecimento", title: "", cycle: "", body: "", authorContext: "Recursos Humanos", showAuthor: false }} />
    </AdminPage>
  );
}
