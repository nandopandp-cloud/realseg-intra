import { notFound } from "next/navigation";
import { RhMobileNav } from "@/components/layout/rh-mobile-nav";
import { allowedRhHrefs } from "@/components/layout/rh-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { DemoBanner } from "@/components/ui/primitives";
import { can, canManage } from "@/server/auth/actor";
import { requireCtx } from "@/server/auth/current";
import { ROLE_LABELS } from "@/server/auth/permissions";
import { unreadCount } from "@/server/services/notifications";
import { getPreferences } from "@/server/services/profile";

/**
 * Ambiente de GESTÃO (RH/Administração). Exige sessão e ao menos uma permissão de gestão;
 * cada página exige ainda a permissão da sua tela (requireRhCtx). Sem acesso: 404.
 */
export default async function RhLayout({ children }: LayoutProps<"/rh">) {
  const ctx = await requireCtx();
  if (!canManage(ctx.actor)) notFound();
  const [unread, prefs] = await Promise.all([unreadCount(ctx), getPreferences(ctx)]);
  const name = ctx.actor.employee?.fullName ?? ctx.actor.email;
  const roleLabel = ctx.actor.roles.includes("RH") ? ROLE_LABELS.RH : ctx.actor.roles.includes("ADMIN") ? ROLE_LABELS.ADMIN : "Gestão";
  const allowed = allowedRhHrefs(ctx.actor.permissions);
  const search = can(ctx.actor, "employee:read:any")
    ? { action: "/rh/colaboradores", label: "Buscar colaboradores", placeholder: "Buscar colaborador por nome ou matrícula..." }
    : undefined;
  const demo = process.env.APP_ENV !== "production";

  return (
    <div className="flex min-h-dvh bg-canvas/40">
      <a href="#conteudo" className="sr-only z-[70] rounded-lg bg-brand-700 px-4 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Pular para o conteúdo
      </a>
      <Sidebar initialCollapsed={prefs.sidebarCollapsed} variant="rh" allowed={allowed} />
      <div className="flex min-w-0 flex-1 flex-col">
        {demo && <DemoBanner />}
        <Topbar name={name} roleLabel={roleLabel} unread={unread} homeHref="/rh" search={search} switchTo={{ href: "/", label: "Área do colaborador", kind: "colaborador" }} />
        <RhMobileNav allowed={allowed} />
        <main id="conteudo" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
