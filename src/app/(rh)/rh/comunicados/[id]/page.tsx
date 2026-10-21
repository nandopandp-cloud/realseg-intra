import type { Metadata } from "next";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/primitives";
import { AnnouncementEditor } from "@/features/rh/announcements/announcement-editor";
import { AnnouncementStatusBadge } from "@/features/rh/announcements/status-badge";
import { AttachmentsManager } from "@/features/rh/attachments-manager";
import { fmtDateTime } from "@/lib/format";
import { can } from "@/server/auth/actor";
import { requireRhCtx } from "@/server/auth/rh";
import { orNotFound } from "@/server/http/page";
import { parseId } from "@/server/http/route";
import { announcementCategoryOptions, getAnnouncementAdmin, ticketCategoryOptions } from "@/server/services/rh/announcements";
import { orgOptions } from "@/server/services/rh/org";

export const metadata: Metadata = { title: "Comunicado · Gestão" };

export default async function EditAnnouncementPage({ params }: PageProps<"/rh/comunicados/[id]">) {
  const ctx = await requireRhCtx("announcement:manage");
  const { id } = await params;
  const a = await orNotFound(Promise.resolve().then(() => getAnnouncementAdmin(ctx, parseId(id, "Comunicado"))));
  const [categories, ticketCategories, org] = await Promise.all([announcementCategoryOptions(), ticketCategoryOptions(), orgOptions(ctx)]);
  const statusLine =
    a.status === "published"
      ? `Publicado em ${fmtDateTime(a.publishedAt!)}${a.version > 1 ? ` · versão ${a.version}` : ""}`
      : a.status === "scheduled"
        ? `Agendado para ${fmtDateTime((a.publishAt ?? a.publishedAt)!)}`
        : a.status === "archived"
          ? `Arquivado${a.archivedAt ? ` em ${fmtDateTime(a.archivedAt)}` : ""}`
          : `Rascunho · atualizado em ${fmtDateTime(a.updatedAt)}`;

  return (
    <AdminPage>
      <AdminPageHeader
        title={a.title}
        crumbs={[{ label: "Comunicados", href: "/rh/comunicados" }]}
        eyebrow={<AnnouncementStatusBadge status={a.status} />}
        description={`${statusLine} · Público: ${a.audienceLabels.join(", ")} (${a.stats.audienceSize} ${a.stats.audienceSize === 1 ? "pessoa" : "pessoas"})`}
      />
      <AnnouncementEditor
        key={`${a.id}-${a.version}-${a.updatedAt.toISOString()}`}
        id={a.id}
        status={a.status}
        canReport={can(ctx.actor, "announcement:report")}
        initial={{
          title: a.title,
          summary: a.summary,
          body: a.body,
          categorySlug: a.categorySlug,
          coverImage: a.coverImage,
          effectiveNote: a.effectiveNote,
          highlights: a.highlights as never,
          tags: a.tags,
          supportTicketCategory: a.supportTicketCategory,
          isImportant: a.isImportant,
          requiresAck: a.requiresAck,
          isFeatured: a.isFeatured,
          authorLabel: a.authorLabel,
          audience: a.audience,
        }}
        categories={categories}
        ticketCategories={ticketCategories}
        audienceOptions={org}
      />
      {a.status !== "archived" && (
        <Card className="mt-6 p-5 xl:mr-[22.5rem]">
          <AttachmentsManager apiBase={`/rh/announcements/${a.id}/attachments`} items={a.attachments} hint="PDF, JPG ou PNG. O colaborador pode baixar cada anexo ou todos de uma vez." />
        </Card>
      )}
    </AdminPage>
  );
}
