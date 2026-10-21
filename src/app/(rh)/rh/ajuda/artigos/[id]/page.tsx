import type { Metadata } from "next";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { ICON_KEYS } from "@/components/ui/icons";
import { Badge } from "@/components/ui/primitives";
import { ArticleForm } from "@/features/rh/help-and-agenda";
import { requireRhCtx } from "@/server/auth/rh";
import { orNotFound } from "@/server/http/page";
import { parseId } from "@/server/http/route";
import { ticketCategoryOptions } from "@/server/services/rh/announcements";
import { getArticleAdmin, listHelpCategoriesAdmin } from "@/server/services/rh/help";

export const metadata: Metadata = { title: "Artigo · Gestão" };

const STATUS = { draft: { tone: "slate", label: "Rascunho" }, published: { tone: "green", label: "Publicado" }, archived: { tone: "slate", label: "Arquivado" } } as const;

export default async function ArticlePage({ params }: PageProps<"/rh/ajuda/artigos/[id]">) {
  const ctx = await requireRhCtx("help:manage");
  const { id } = await params;
  const a = await orNotFound(Promise.resolve().then(() => getArticleAdmin(ctx, parseId(id, "Artigo"))));
  const [categories, ticketCategories] = await Promise.all([listHelpCategoriesAdmin(ctx), ticketCategoryOptions()]);
  const votes = a.helpful + a.notHelpful;
  return (
    <AdminPage>
      <AdminPageHeader
        title={a.title}
        crumbs={[{ label: "Central de ajuda", href: "/rh/ajuda" }]}
        eyebrow={<Badge tone={STATUS[a.status].tone}>{STATUS[a.status].label}</Badge>}
        description={`${a.viewCount} acessos${votes ? ` · ${Math.round((a.helpful / votes) * 100)}% acharam útil (${votes} votos)` : ""}`}
      />
      <ArticleForm
        key={a.updatedAt.toISOString()}
        id={a.id}
        slug={a.slug}
        status={a.status}
        initial={{ title: a.title, summary: a.summary, body: a.body, categorySlug: a.categorySlug, type: a.type, icon: a.icon, color: a.color, ticketCategorySlug: a.ticketCategorySlug ?? "" }}
        categories={categories}
        ticketCategories={ticketCategories}
        icons={ICON_KEYS}
      />
    </AdminPage>
  );
}
