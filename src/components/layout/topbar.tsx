import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { NotificationBell, UserMenu, type BellItem } from "./menus";

export function Topbar({ name, roleLabel, unread, notifications }: { name: string; roleLabel: string; unread: number; notifications: BellItem[] }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="flex h-[4.5rem] items-center gap-3 px-4 sm:px-6 lg:h-[5.25rem] lg:px-10">
        <Link href="/" className="shrink-0 rounded-lg lg:hidden" aria-label="REALSEG — página inicial">
          <Image src="/brand/logo-light.png" unoptimized alt="REALSEG Security Intelligence" width={398} height={80} priority className="h-auto w-[150px] min-[400px]:w-[170px] sm:w-[210px]" />
        </Link>
        <form action="/busca" method="get" role="search" className="hidden max-w-[43rem] flex-1 lg:block">
          <label htmlFor="busca-global" className="sr-only">
            Pesquisar na intranet
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" aria-hidden />
            <input
              id="busca-global"
              name="q"
              type="search"
              placeholder="Pesquisar na intranet..."
              maxLength={100}
              className="h-12 w-full rounded-xl border border-transparent bg-field pr-4 pl-12 text-[0.9375rem] text-ink placeholder:text-muted focus:border-brand-600 focus:bg-surface focus:outline-none"
            />
          </div>
        </form>
        <div className="ml-auto flex items-center gap-0 sm:gap-3">
          <Link href="/busca" className="inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-canvas lg:hidden" aria-label="Pesquisar na intranet">
            <Search className="size-6" strokeWidth={1.75} aria-hidden />
          </Link>
          <NotificationBell unread={unread} items={notifications} />
          <span className="hidden h-8 w-px bg-line sm:block" aria-hidden />
          <UserMenu name={name} roleLabel={roleLabel} />
        </div>
      </div>
    </header>
  );
}
