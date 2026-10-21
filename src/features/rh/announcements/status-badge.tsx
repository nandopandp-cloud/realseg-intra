import { Badge } from "@/components/ui/primitives";
import type { Tone } from "@/components/ui/icons";

const MAP: Record<string, { tone: Tone; label: string }> = {
  draft: { tone: "slate", label: "Rascunho" },
  scheduled: { tone: "blue", label: "Agendado" },
  published: { tone: "green", label: "Publicado" },
  archived: { tone: "slate", label: "Arquivado" },
};

export function AnnouncementStatusBadge({ status }: { status: string }) {
  const m = MAP[status] ?? { tone: "slate" as Tone, label: status };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
