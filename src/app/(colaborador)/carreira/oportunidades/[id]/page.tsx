import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CalendarClock, MapPin } from "lucide-react";
import { Badge, Breadcrumbs, Card } from "@/components/ui/primitives";
import { ApplyActions } from "@/features/career/apply-button";
import { fmtDateLong } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { isUuid, orNotFound } from "@/server/http/page";
import { getOpportunity } from "@/server/services/career";

export const metadata: Metadata = { title: "Oportunidade interna" };

export default async function OpportunityPage({ params }: PageProps<"/carreira/oportunidades/[id]">) {
  const ctx = await requireCtx();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const o = await orNotFound(getOpportunity(ctx, id));
  return (
    <div className="mx-auto max-w-3xl px-4 pt-5 sm:px-6 lg:px-10 lg:pt-8">
      <Breadcrumbs items={[{ label: "Minha carreira", href: "/carreira" }, { label: "Oportunidades", href: "/carreira/oportunidades" }, { label: o.title }]} />
      <Link href="/carreira/oportunidades" className="inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold text-brand-600 lg:hidden">
        <ArrowLeft className="size-4" aria-hidden /> Oportunidades
      </Link>
      <div className="mt-2 flex flex-wrap gap-2 lg:mt-6">
        {o.isNew && <Badge tone="green">Nova</Badge>}
        {o.isHighlighted && <Badge tone="blue">Em destaque</Badge>}
      </div>
      <h1 className="mt-3 text-[2rem] font-bold tracking-tight text-ink sm:text-[2.5rem]">{o.title}</h1>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[0.9375rem] text-muted">
        <li className="flex items-center gap-1.5">
          <Building2 className="size-4" aria-hidden /> {o.areaLabel}
        </li>
        {o.location && (
          <li className="flex items-center gap-1.5">
            <MapPin className="size-4" aria-hidden /> {o.location}
          </li>
        )}
        {o.closesAt && (
          <li className="flex items-center gap-1.5">
            <CalendarClock className="size-4" aria-hidden /> Inscrições até {fmtDateLong(o.closesAt)}
          </li>
        )}
      </ul>
      <Card className="mt-6 p-5 sm:p-6" as="div">
        <h2 className="font-bold text-ink">Sobre a vaga</h2>
        <p className="mt-1 text-muted">{o.description}</p>
        <h2 className="mt-5 font-bold text-ink">Requisitos</h2>
        <p className="mt-1 text-muted">{o.requirements}</p>
      </Card>
      <div className="mt-6">
        <ApplyActions id={o.id} status={o.applicationStatus} />
      </div>
    </div>
  );
}
