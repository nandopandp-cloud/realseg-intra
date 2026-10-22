"use client";

import Link from "@/components/ui/app-link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Bell, ChevronDown, House, KeyRound, LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { fmtRelative } from "@/lib/format";
import { api } from "@/lib/api-client";

/** Disclosure com fechamento por Esc/clique fora; foco retorna ao botão. */
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { open, setOpen, ref, buttonRef };
}

function Panel({ id, open, children, className }: { id: string; open: boolean; children: ReactNode; className?: string }) {
  return (
    <div id={id} hidden={!open} className={cn("absolute top-full right-0 z-50 mt-2 rounded-2xl border border-line bg-surface shadow-[var(--shadow-raised)]", className)}>
      {children}
    </div>
  );
}

export type BellItem = { id: string; title: string; body: string | null; link: string | null; createdAt: string; readAt: string | null };

export function NotificationBell({ unread }: { unread: number }) {
  const { open, setOpen, ref, buttonRef } = usePopover();
  const id = useId();
  const router = useRouter();
  // Lista carregada sob demanda (ao abrir), não em toda navegação — docs/operacao/otimizacao-de-custos.md §4.
  const [items, setItems] = useState<BellItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      setFailed(false);
      try {
        const r = await api<{ items: BellItem[] }>("/notifications?pageSize=6");
        setItems(r.items);
      } catch {
        setFailed(true);
      }
    }
  }

  async function openItem(item: BellItem) {
    setOpen(false);
    if (!item.readAt) await api(`/notifications/${item.id}/read`, { method: "POST" }).catch(() => {});
    router.push(item.link ?? "/notificacoes");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={toggle}
        className="relative inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-canvas"
        aria-label={unread > 0 ? `Notificações: ${unread} não lidas` : "Notificações"}
      >
        <Bell className="size-6" strokeWidth={1.75} aria-hidden />
        {unread > 0 && <span className="absolute top-2 right-2 size-2.5 rounded-full bg-brand-500 ring-2 ring-surface" aria-hidden />}
      </button>
      <Panel id={id} open={open} className="w-[min(22rem,calc(100vw-2rem))]">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="font-bold text-ink">Notificações</p>
          {unread > 0 && <span className="text-sm text-muted">{unread} não lidas</span>}
        </div>
        {items === null && !failed ? (
          <p className="px-4 py-6 text-center text-[0.9375rem] text-muted" role="status">
            Carregando…
          </p>
        ) : failed ? (
          <p className="px-4 py-6 text-center text-[0.9375rem] text-muted" role="alert">
            Não foi possível carregar. Tente novamente.
          </p>
        ) : items!.length === 0 ? (
          <p className="px-4 py-6 text-center text-[0.9375rem] text-muted">Você não tem notificações.</p>
        ) : (
          <ul className="max-h-96 overflow-y-auto py-1">
            {items!.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => openItem(n)} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-canvas">
                  <span className={cn("mt-2 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-brand-500")} aria-hidden />
                  <span className="min-w-0">
                    <span className={cn("block text-[0.9375rem] text-ink", !n.readAt && "font-semibold")}>
                      {n.title}
                      {!n.readAt && <span className="sr-only"> (não lida)</span>}
                    </span>
                    {n.body && <span className="block truncate text-sm text-muted">{n.body}</span>}
                    <span className="block text-xs text-muted">{fmtRelative(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-line p-2">
          <Link href="/notificacoes" onClick={() => setOpen(false)} className="flex min-h-11 items-center justify-center rounded-lg text-[0.9375rem] font-semibold text-brand-600 hover:bg-canvas">
            Ver todas as notificações
          </Link>
        </div>
      </Panel>
    </div>
  );
}

/** Atalho entre a área do colaborador e o ambiente de gestão (só aparece para quem tem acesso). */
export type SwitchLink = { href: string; label: string; kind: "rh" | "colaborador" };

export function UserMenu({ name, roleLabel, switchTo }: { name: string; roleLabel: string; switchTo?: SwitchLink }) {
  const { open, setOpen, ref, buttonRef } = usePopover();
  const id = useId();
  const [leaving, setLeaving] = useState(false);

  async function logout() {
    setLeaving(true);
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    // Recarga completa: descarta qualquer estado/cache do cliente da sessão encerrada.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login?motivo=saiu");
  }

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
        className="flex min-h-11 items-center gap-3 rounded-full py-1 pr-2 pl-1 hover:bg-canvas lg:pr-3"
      >
        <Avatar name={name} />
        <span className="hidden text-left lg:block">
          <span className="block text-[0.9375rem] font-semibold text-ink">{name}</span>
          <span className="block text-xs text-muted">{roleLabel}</span>
        </span>
        <ChevronDown className="size-5 text-ink" aria-hidden />
        <span className="sr-only">Abrir menu da conta</span>
      </button>
      <Panel id={id} open={open} className="w-64 p-2">
        <p className="px-3 py-2 lg:hidden">
          <span className="block font-semibold text-ink">{name}</span>
          <span className="block text-sm text-muted">{roleLabel}</span>
        </p>
        <ul>
          {switchTo && (
            <li className="mb-1 border-b border-line pb-1">
              <Link href={switchTo.href} onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-[0.9375rem] font-semibold text-brand-700 hover:bg-brand-50">
                {switchTo.kind === "rh" ? <LayoutDashboard className="size-5" aria-hidden /> : <House className="size-5" aria-hidden />} {switchTo.label}
              </Link>
            </li>
          )}
          <li>
            <Link href="/perfil" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-[0.9375rem] text-ink hover:bg-canvas">
              <UserRound className="size-5 text-muted" aria-hidden /> Meu perfil
            </Link>
          </li>
          <li>
            <Link href="/notificacoes" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-[0.9375rem] text-ink hover:bg-canvas">
              <Bell className="size-5 text-muted" aria-hidden /> Notificações
            </Link>
          </li>
          <li>
            <Link href="/perfil/seguranca" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-[0.9375rem] text-ink hover:bg-canvas">
              <KeyRound className="size-5 text-muted" aria-hidden /> Senha e segurança
            </Link>
          </li>
          <li className="mt-1 border-t border-line pt-1">
            <button type="button" onClick={logout} disabled={leaving} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-[0.9375rem] text-red-700 hover:bg-red-50">
              <LogOut className="size-5" aria-hidden /> {leaving ? "Saindo…" : "Sair"}
            </button>
          </li>
        </ul>
      </Panel>
    </div>
  );
}
