import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { DemoBanner } from "@/components/ui/primitives";
import { requireCtx } from "@/server/auth/current";
import { unreadCount } from "@/server/services/notifications";
import { getPreferences } from "@/server/services/profile";

/** Ambiente do COLABORADOR. Toda página abaixo exige sessão válida (verificada no servidor). */
export default async function ColaboradorLayout({ children }: LayoutProps<"/">) {
  const ctx = await requireCtx();
  const [unread, prefs] = await Promise.all([unreadCount(ctx), getPreferences(ctx)]);
  const name = ctx.actor.employee?.fullName ?? ctx.actor.email;
  const demo = process.env.APP_ENV !== "production";

  return (
    <div className="flex min-h-dvh bg-surface">
      <a href="#conteudo" className="sr-only z-[70] rounded-lg bg-brand-700 px-4 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Pular para o conteúdo
      </a>
      <Sidebar initialCollapsed={prefs.sidebarCollapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        {demo && <DemoBanner />}
        <Topbar name={name} roleLabel="Colaborador" unread={unread} />
        <main id="conteudo" tabIndex={-1} className="flex-1 pb-28 outline-none lg:pb-12">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
