import { Skeleton } from "@/components/ui/primitives";

export default function Loading() {
  return (
    <div className="px-4 pt-6 sm:px-6 lg:px-10" role="status" aria-live="polite">
      <span className="sr-only">Carregando…</span>
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-4 h-12 w-80 max-w-full" />
      <Skeleton className="mt-3 h-5 w-[32rem] max-w-full" />
      <div className="mt-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36" />
        ))}
      </div>
      <Skeleton className="mt-6 h-64" />
    </div>
  );
}
