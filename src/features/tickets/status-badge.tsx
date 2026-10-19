import { Badge } from "@/components/ui/primitives";
import type { Tone } from "@/components/ui/icons";

const MAP: Record<string, { tone: Tone; label: string }> = {
  aberto: { tone: "blue", label: "Aberto" },
  em_andamento: { tone: "amber", label: "Em andamento" },
  aguardando_colaborador: { tone: "red", label: "Aguardando você" },
  respondido: { tone: "teal", label: "Respondido" },
  resolvido: { tone: "green", label: "Resolvido" },
  fechado: { tone: "slate", label: "Concluído" },
  cancelado: { tone: "slate", label: "Cancelado" },
};

/** `short`: rótulos curtos para listas compactas ("Aguardando" em vez de "Aguardando você"). */
export function TicketStatusBadge({ status, short }: { status: string; short?: boolean }) {
  const m = MAP[status] ?? { tone: "slate" as Tone, label: status };
  const label = short && status === "aguardando_colaborador" ? "Aguardando" : m.label;
  return (
    <Badge tone={m.tone}>
      {label}
      {label !== m.label && <span className="sr-only"> sua resposta</span>}
    </Badge>
  );
}

export const SUBMISSION_STATUS: Record<string, { tone: Tone; label: string }> = {
  enviado: { tone: "blue", label: "Enviado" },
  em_analise: { tone: "amber", label: "Em análise" },
  aceito: { tone: "green", label: "Aceito" },
  recusado: { tone: "red", label: "Recusado" },
  cancelado: { tone: "slate", label: "Cancelado" },
};

export function SubmissionStatusBadge({ status }: { status: string }) {
  const m = SUBMISSION_STATUS[status] ?? { tone: "slate" as Tone, label: status };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
