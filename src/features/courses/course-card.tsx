import Image from "next/image";
import Link from "@/components/ui/app-link";
import { ChevronRight, FileText } from "lucide-react";
import { toTone, TONE } from "@/components/ui/icons";
import { Badge, ProgressBar } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { fmtMinutes } from "@/lib/format";

export type CourseCardData = {
  slug: string;
  title: string;
  coverImage: string | null;
  isMandatory: boolean;
  lessonCount: number;
  durationMinutes: number;
  progressPercent: number | null;
  enrollmentStatus: "em_andamento" | "concluido" | null;
  category: { slug: string; name: string; color: string };
};

export function CourseCard({ c }: { c: CourseCardData }) {
  const tone = toTone(c.category.color);
  return (
    <Link href={`/cursos/${c.slug}`} className="group flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-2.5 pr-3 transition-shadow hover:shadow-[var(--shadow-raised)]">
      <span className="relative h-[5.5rem] w-[8.25rem] shrink-0 overflow-hidden rounded-xl bg-field sm:h-24 sm:w-36">
        {c.coverImage && <Image src={c.coverImage} alt="" fill sizes="150px" className="object-cover" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap gap-1.5">
          {c.isMandatory ? (
            <span className="rounded-full bg-brand-100 px-2.5 py-0.5 font-mono text-[0.6875rem] font-medium tracking-[0.12em] text-brand-700 uppercase">Obrigatório</span>
          ) : (
            <span className={cn("rounded-full px-2.5 py-0.5 font-mono text-[0.6875rem] font-medium tracking-[0.12em] uppercase", TONE[tone].soft, TONE[tone].text)}>{c.category.name}</span>
          )}
          {c.enrollmentStatus === "concluido" && <Badge tone="green">Concluído</Badge>}
        </span>
        <span className="mt-1.5 block leading-snug font-bold text-ink">{c.title}</span>
        <span className="mt-1 flex items-center gap-1.5 text-sm text-muted">
          <FileText className="size-4" aria-hidden /> {c.lessonCount} aulas • {fmtMinutes(c.durationMinutes)}
        </span>
        {c.enrollmentStatus === "em_andamento" && c.progressPercent != null && (
          <span className="mt-2 flex items-center gap-2">
            <ProgressBar value={c.progressPercent} label={`Progresso: ${c.progressPercent}%`} className="h-1.5 max-w-40" />
            <span className="text-xs text-muted">{c.progressPercent}%</span>
          </span>
        )}
      </span>
      <ChevronRight className="size-5 shrink-0 text-ink/70 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
