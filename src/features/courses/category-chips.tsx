import Link from "@/components/ui/app-link";
import { LayoutGrid } from "lucide-react";
import { iconFor } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export function CourseCategoryChips({ categories, active }: { categories: Array<{ slug: string; name: string; icon: string }>; active?: string }) {
  const items = [{ slug: "", name: "Todos", icon: "" }, ...categories];
  return (
    <nav aria-label="Categorias de cursos" className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-2">
        {items.map((c) => {
          const on = (active ?? "") === c.slug;
          const Icon = c.slug ? iconFor(c.icon) : LayoutGrid;
          return (
            <li key={c.slug || "todos"}>
              <Link
                href={c.slug ? `/cursos?categoria=${c.slug}` : "/cursos"}
                aria-current={on ? "page" : undefined}
                className={cn("inline-flex min-h-12 items-center gap-2.5 rounded-xl px-4 text-[0.9375rem] font-medium transition-colors", on ? "bg-brand-700 text-white" : "bg-field text-ink hover:bg-line")}
              >
                <Icon className="size-5" aria-hidden />
                {c.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
