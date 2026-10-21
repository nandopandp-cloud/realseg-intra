import type { Metadata } from "next";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { AnnouncementEditor, EMPTY_ANNOUNCEMENT } from "@/features/rh/announcements/announcement-editor";
import { requireRhCtx } from "@/server/auth/rh";
import { announcementCategoryOptions, ticketCategoryOptions } from "@/server/services/rh/announcements";
import { orgOptions } from "@/server/services/rh/org";

export const metadata: Metadata = { title: "Novo comunicado · Gestão" };

export default async function NewAnnouncementPage() {
  const ctx = await requireRhCtx("announcement:manage");
  const [categories, ticketCategories, org] = await Promise.all([announcementCategoryOptions(), ticketCategoryOptions(), orgOptions(ctx)]);
  return (
    <AdminPage>
      <AdminPageHeader title="Novo comunicado" crumbs={[{ label: "Comunicados", href: "/rh/comunicados" }]} description="Comece como rascunho: ninguém vê o comunicado até você publicar." />
      <AnnouncementEditor initial={EMPTY_ANNOUNCEMENT} categories={categories} ticketCategories={ticketCategories} audienceOptions={org} />
    </AdminPage>
  );
}
