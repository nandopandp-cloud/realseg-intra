import { Badge } from "@/components/ui/primitives";
import type { Tone } from "@/components/ui/icons";

const STATUS: Record<string, { tone: Tone; label: string }> = {
  aberto: { tone: "blue", label: "Aberto" },
  em_andamento: { tone: "amber", label: "Em andamento" },
  aguardando_colaborador: { tone: "purple", label: "Aguardando colaborador" },
  respondido: { tone: "teal", label: "Respondido" },
  resolvido: { tone: "green", label: "Resolvido" },
  fechado: { tone: "slate", label: "Concluído" },
  cancelado: { tone: "slate", label: "Cancelado" },
};

/** Situação do ponto de vista do atendimento (texto sempre visível). */
export function AgentStatusBadge({ status }: { status: string }) {
  const m = STATUS[status] ?? { tone: "slate" as Tone, label: status };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

const PRIORITY: Record<string, { tone: Tone; label: string }> = {
  baixa: { tone: "slate", label: "Baixa" },
  normal: { tone: "blue", label: "Normal" },
  alta: { tone: "orange", label: "Alta" },
  urgente: { tone: "red", label: "Urgente" },
};

export function PriorityBadge({ priority }: { priority: string }) {
  const m = PRIORITY[priority] ?? { tone: "slate" as Tone, label: priority };
  return (
    <Badge tone={m.tone} dot>
      {m.label}
    </Badge>
  );
}

export const AGENT_STATUS_OPTIONS = STATUS;
