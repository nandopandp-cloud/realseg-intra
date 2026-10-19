import { notFound, redirect } from "next/navigation";
import { requireCtx } from "@/server/auth/current";
import { orNotFound } from "@/server/http/page";
import { getHelpCategory } from "@/server/services/help";

/** Categoria de ajuda = base de conhecimento já filtrada (uma só tela, com os demais filtros à mão). */
export default async function HelpCategoryPage({ params }: PageProps<"/ajuda/categorias/[slug]">) {
  const ctx = await requireCtx();
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) notFound();
  await orNotFound(getHelpCategory(ctx, slug));
  redirect(`/ajuda/artigos?categoria=${slug}`);
}
