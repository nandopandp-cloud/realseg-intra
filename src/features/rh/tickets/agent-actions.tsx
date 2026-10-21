"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock, Send, UserRoundCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/form";
import { FileUpload } from "@/components/ui/file-upload";
import { Alert } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";

const STATUS_LABEL: Record<string, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  aguardando_colaborador: "Aguardando colaborador",
  respondido: "Respondido",
  resolvido: "Resolvido",
  fechado: "Concluído",
  cancelado: "Cancelado",
};
const PRIORITIES = [
  { value: "baixa", label: "Baixa" },
  { value: "normal", label: "Normal" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

/** Resposta ao colaborador ou nota interna (nunca exibida ao colaborador), com mudança de situação opcional. */
export function AgentReplyForm({ number, transitions }: { number: number; transitions: string[] }) {
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [setStatus, setSetStatus] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return setError("Escreva a mensagem.");
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("body", body.trim());
    fd.set("internal", String(internal));
    if (setStatus && !internal) fd.set("setStatus", setStatus);
    files.forEach((f) => fd.append("files", f));
    try {
      await api(`/rh/tickets/${number}/messages`, { formData: fd });
      setBody("");
      setFiles([]);
      setSetStatus("");
      toast("success", internal ? "Nota interna registrada." : "Resposta enviada ao colaborador.");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível enviar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4" aria-labelledby="responder">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="responder" className="text-lg font-bold text-ink">
          {internal ? "Nota interna" : "Responder ao colaborador"}
        </h2>
        <div role="radiogroup" aria-label="Tipo de mensagem" className="inline-flex rounded-xl border border-line p-1">
          {[
            { v: false, label: "Resposta" },
            { v: true, label: "Nota interna" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={internal === o.v}
              onClick={() => setInternal(o.v)}
              className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold", internal === o.v ? (o.v ? "bg-amber-100 text-amber-800" : "bg-brand-700 text-white") : "text-muted hover:text-ink")}
            >
              {o.v && <Lock className="size-3.5" aria-hidden />}
              {o.label}
            </button>
          ))}
        </div>
      </div>
      {internal && <Alert kind="warning">Notas internas ficam visíveis apenas para a equipe de atendimento.</Alert>}
      <Field label="Mensagem" error={error ?? undefined} labelHidden>
        {({ id, describedBy, invalid }) => (
          <Textarea
            id={id}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={internal ? "Registre uma observação para a equipe..." : "Escreva a resposta para o colaborador..."}
            maxLength={5000}
            aria-describedby={describedBy}
            invalid={invalid}
            className={cn(internal && "bg-amber-50/60")}
          />
        )}
      </Field>
      {!internal && transitions.length > 0 && (
        <Field label="Depois de enviar, mudar a situação para" hint="Opcional. Ex.: “Aguardando colaborador” pausa o prazo até a resposta.">
          {({ id, describedBy }) => (
            <Select id={id} value={setStatus} onChange={(e) => setSetStatus(e.target.value)} aria-describedby={describedBy} className="sm:max-w-sm">
              <option value="">Manter a situação atual</option>
              {transitions.map((t) => (
                <option key={t} value={t}>
                  {STATUS_LABEL[t] ?? t}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}
      <FileUpload label="Anexos (opcional)" files={files} onChange={setFiles} max={5} allowCamera={false} />
      <div>
        <Button type="submit" loading={busy} variant={internal ? "secondary" : "primary"} icon={internal ? <Lock className="size-5" aria-hidden /> : <Send className="size-5" aria-hidden />}>
          {internal ? "Registrar nota" : "Enviar resposta"}
        </Button>
      </div>
    </form>
  );
}

/** Painel lateral: situação, responsável e prioridade. Cada alteração fica no histórico da solicitação. */
export function TicketControls({
  number,
  status,
  transitions,
  assigneeUserId,
  agents,
  priority,
  me,
  closed,
}: {
  number: number;
  status: string;
  transitions: string[];
  assigneeUserId: string | null;
  agents: Array<{ id: string; name: string }>;
  priority: string;
  me: string;
  closed: boolean;
}) {
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();
  const meIsAgent = agents.some((a) => a.id === me);

  async function run(key: string, path: string, json: unknown, ok: string) {
    setBusy(key);
    setError(null);
    try {
      await api(`/rh/tickets/${number}/${path}`, { json });
      toast("success", ok);
      if (key === "status") {
        setTo("");
        setNote("");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível concluir.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {error && <Alert kind="error">{error}</Alert>}

      <section aria-labelledby="ctl-resp">
        <h3 id="ctl-resp" className="text-sm font-semibold text-ink">
          Responsável
        </h3>
        <div className="mt-2 flex flex-col gap-2">
          <Select
            aria-labelledby="ctl-resp"
            value={assigneeUserId ?? ""}
            disabled={closed || busy !== null}
            onChange={(e) => run("assign", "assign", { assigneeUserId: e.target.value || null }, e.target.value ? "Responsável atualizado." : "Responsável removido.")}
          >
            <option value="">Sem responsável</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
          {!closed && meIsAgent && assigneeUserId !== me && (
            <Button variant="outline" size="sm" loading={busy === "assign"} onClick={() => run("assign", "assign", { assigneeUserId: me }, "A solicitação agora está com você.")} icon={<UserRoundCheck className="size-4" aria-hidden />}>
              Assumir solicitação
            </Button>
          )}
        </div>
      </section>

      <section aria-labelledby="ctl-prio">
        <h3 id="ctl-prio" className="text-sm font-semibold text-ink">
          Prioridade
        </h3>
        <p className="text-sm text-muted">Alterar a prioridade recalcula o prazo pela política de SLA.</p>
        <Select aria-labelledby="ctl-prio" className="mt-2" value={priority} disabled={closed || busy !== null} onChange={(e) => run("priority", "priority", { priority: e.target.value }, "Prioridade e prazo atualizados.")}>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </section>

      <section aria-labelledby="ctl-status">
        <h3 id="ctl-status" className="text-sm font-semibold text-ink">
          Situação: <span className="font-normal">{STATUS_LABEL[status] ?? status}</span>
        </h3>
        {transitions.length === 0 ? (
          <p className="mt-1 text-sm text-muted">Solicitação encerrada. Não há mudanças possíveis.</p>
        ) : (
          <form
            className="mt-2 flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!to) return setError("Escolha a nova situação.");
              run("status", "status", { to, note: note.trim() || undefined }, `Situação alterada para “${STATUS_LABEL[to]}”.`);
            }}
          >
            <Select aria-label="Nova situação" value={to} onChange={(e) => setTo(e.target.value)}>
              <option value="">Escolha a nova situação</option>
              {transitions.map((t) => (
                <option key={t} value={t}>
                  {STATUS_LABEL[t] ?? t}
                </option>
              ))}
            </Select>
            <Textarea aria-label="Observação (opcional, fica no histórico)" placeholder="Observação (opcional, fica no histórico)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="min-h-20" />
            <Button type="submit" size="sm" loading={busy === "status"}>
              Alterar situação
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
