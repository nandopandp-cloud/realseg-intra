import type { Metadata } from "next";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { ICON_KEYS } from "@/components/ui/icons";
import { ArticleForm, EMPTY_ARTICLE } from "@/features/rh/help-and-agenda";
import { requireRhCtx } from "@/server/auth/rh";
import { ticketCategoryOptions } from "@/server/services/rh/announcements";
import { listHelpCategoriesAdmin } from "@/server/services/rh/help";

export const metadata: Metadata = { title: "Novo artigo · Gestão" };

export default async function NewArticlePage() {
  const ctx = await requireRhCtx("help:manage");
  const [categories, ticketCategories] = await Promise.all([listHelpCategoriesAdmin(ctx), ticketCategoryOptions()]);
  return (
    <AdminPage>
      <AdminPageHeader title="Novo artigo" crumbs={[{ label: "Central de ajuda", href: "/rh/ajuda" }]} description="Começa como rascunho; publique quando estiver pronto." />
      <ArticleForm initial={EMPTY_ARTICLE} categories={categories} ticketCategories={ticketCategories} icons={ICON_KEYS} />
    </AdminPage>
  );
}
