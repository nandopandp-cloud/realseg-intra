import { BrandLogo } from "@/components/ui/brand-logo";
import Link from "@/components/ui/app-link";
import { Search } from "lucide-react";
import { NotificationBell, UserMenu, type SwitchLink } from "./menus";

type SearchConfig = { action: string; label: string; placeholder: string };
const DEFAULT_SEARCH: SearchConfig = { action: "/busca", label: "Pesquisar na intranet", placeholder: "Pesquisar na intranet..." };

export function Topbar({
  name,
  roleLabel,
  unread,
  homeHref = "/",
  search = DEFAULT_SEARCH,
  switchTo,
}: {
  name: string;
  roleLabel: string;
  unread: number;
  homeHref?: string;
  search?: SearchConfig;
  switchTo?: SwitchLink;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="flex h-[4.5rem] items-center gap-3 px-4 sm:px-6 lg:h-[5.25rem] lg:px-10">
        <Link href={homeHref} className="shrink-0 rounded-lg lg:hidden" aria-label="REALSEG — página inicial">
          <BrandLogo variant="light" size="sm" />
        </Link>
        <form action={search.action} method="get" role="search" className="hidden max-w-[43rem] flex-1 lg:block">
          <label htmlFor="busca-global" className="sr-only">
            {search.label}
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" aria-hidden />
            <input
              id="busca-global"
              name="q"
              type="search"
              placeholder={search.placeholder}
              maxLength={100}
              className="h-12 w-full rounded-xl border border-transparent bg-field pr-4 pl-12 text-[0.9375rem] text-ink placeholder:text-muted focus:border-brand-600 focus:bg-surface focus:outline-none"
            />
          </div>
        </form>
        <div className="ml-auto flex items-center gap-0 sm:gap-3">
          <Link href={search.action} className="hidden size-11 items-center justify-center rounded-full text-ink hover:bg-canvas sm:inline-flex lg:hidden" aria-label={search.label}>
            <Search className="size-6" strokeWidth={1.75} aria-hidden />
          </Link>
          <NotificationBell unread={unread} />
          <span className="hidden h-8 w-px bg-line sm:block" aria-hidden />
          <UserMenu name={name} roleLabel={roleLabel} switchTo={switchTo} />
        </div>
      </div>
    </header>
  );
}
