import type { Metadata } from "next";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/primitives";
import { FeedbackForm } from "@/features/rh/feedback-form";
import { fmtDateTime } from "@/lib/format";
import { requireRhCtx } from "@/server/auth/rh";
import { orNotFound } from "@/server/http/page";
import { parseId } from "@/server/http/route";
import { getFeedbackAdmin } from "@/server/services/rh/feedbacks";

export const metadata: Metadata = { title: "Feedback · Gestão" };

const STATUS = { rascunho: { tone: "slate", label: "Rascunho" }, publicado: { tone: "green", label: "Publicado" }, arquivado: { tone: "slate", label: "Arquivado" } } as const;

export default async function FeedbackPage({ params }: PageProps<"/rh/feedbacks/[id]">) {
  const ctx = await requireRhCtx("feedback:write:any");
  const { id } = await params;
  const f = await orNotFound(Promise.resolve().then(() => getFeedbackAdmin(ctx, parseId(id, "Feedback"))));
  return (
    <AdminPage>
      <AdminPageHeader
        title={f.title}
        crumbs={[{ label: "Feedbacks", href: "/rh/feedbacks" }]}
        eyebrow={<Badge tone={STATUS[f.status].tone}>{STATUS[f.status].label}</Badge>}
        description={`${f.employee.name} · ${f.employee.position} · ${f.employee.unit}${f.publishedAt ? ` · publicado em ${fmtDateTime(f.publishedAt)}` : ""}${f.status === "publicado" ? (f.acknowledgedAt ? ` · lido em ${fmtDateTime(f.acknowledgedAt)}` : " · leitura pendente") : ""}${f.authorName ? ` · registrado por ${f.authorName}` : ""}`}
      />
      <FeedbackForm
        key={f.updatedAt.toISOString()}
        id={f.id}
        status={f.status}
        initial={{ employee: { id: f.employee.id, name: f.employee.name, registration: f.employee.registration }, type: f.type, title: f.title, cycle: f.cycle ?? "", body: f.body, authorContext: f.authorContext, showAuthor: f.showAuthor }}
      />
    </AdminPage>
  );
}
