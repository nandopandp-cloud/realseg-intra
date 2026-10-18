import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { z } from "zod";
import { PageBody, PageHero } from "@/components/layout/page-hero";
import { LinkTabs, Pagination } from "@/components/ui/navigation";
import { Card, EmptyState } from "@/components/ui/primitives";
import { MarkAllRead, NotificationLink } from "@/features/profile/notification-actions";
import { cn } from "@/lib/cn";
import { fmtDateTime } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { CATEGORY_LABELS, listNotifications, unreadCount } from "@/server/services/notifications";

export const metadata: Metadata = { title: "Notificações" };

export default async function NotificationsPage({ searchParams }: PageProps<"/notificacoes">) {
  const ctx = await requireCtx();
  const sp = z.object({ filtro: z.enum(["all", "unread"]).catch("all"), page: z.coerce.number().int().min(1).catch(1) }).parse(await searchParams);
  const [list, unread] = await Promise.all([listNotifications(ctx, { filter: sp.filtro, page: sp.page }), unreadCount(ctx)]);
  return (
    <>
      <PageHero eyebrow="Avisos" title="Notificações" subtitle="Atualizações de comunicados, documentos, solicitações e cursos." breadcrumb={[{ label: "Início", href: "/" }, { label: "Notificações" }]} actions={unread > 0 ? <MarkAllRead /> : undefined} />
      <PageBody>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <LinkTabs label="Filtrar notificações" items={[{ href: "/notificacoes", label: "Todas", active: sp.filtro === "all" }, { href: "/notificacoes?filtro=unread", label: "Não lidas", badge: unread, active: sp.filtro === "unread" }]} />
          <div className="lg:hidden">{unread > 0 && <MarkAllRead />}</div>
        </div>
        <Card className="mt-4 p-2">
          {list.items.length === 0 ? (
            <EmptyState className="m-2 border-0" icon={Bell} title={sp.filtro === "unread" ? "Nenhuma notificação não lida" : "Nenhuma notificação"} description="Você será avisado aqui sobre novidades importantes." />
          ) : (
            <ul className="divide-y divide-line">
              {list.items.map((n) => (
                <li key={n.id}>
                  <NotificationLink id={n.id} href={n.link ?? "/notificacoes"} unread={!n.readAt}>
                    <span className="flex gap-3 rounded-xl px-3 py-3.5 hover:bg-canvas">
                      <span className={cn("mt-2 size-2.5 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-brand-500")} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="text-xs font-medium tracking-wide text-muted uppercase">{CATEGORY_LABELS[n.category]}</span>
                        <span className={cn("block text-[0.9375rem] text-ink", !n.readAt && "font-bold")}>
                          {n.title}
                          {!n.readAt && <span className="sr-only"> (não lida)</span>}
                        </span>
                        {n.body && <span className="block text-sm text-muted">{n.body}</span>}
                        <span className="block text-xs text-muted">{fmtDateTime(n.createdAt)}</span>
                      </span>
                    </span>
                  </NotificationLink>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {list.total > list.pageSize && (
          <div className="mt-4">
            <Pagination page={list.page} pageCount={list.pageCount} total={list.total} shown={list.items.length} noun="notificações" makeHref={(p) => `/notificacoes?${sp.filtro === "unread" ? "filtro=unread&" : ""}page=${p}`} />
          </div>
        )}
      </PageBody>
    </>
  );
}
