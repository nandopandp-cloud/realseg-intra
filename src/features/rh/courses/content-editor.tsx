"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, FileText, Pencil, Plus, PlayCircle, Paperclip, Trash2 } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Alert, Badge, Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { fmtMinutes } from "@/lib/format";

type Lesson = { id: string; title: string; type: "texto" | "video" | "material"; content: string; videoUrl: string | null; durationMinutes: number; completions: number };
type Module = { id: string; title: string; lessons: Lesson[] };
type LessonDraft = { title: string; type: Lesson["type"]; content: string; videoUrl: string; durationMinutes: number | "" };

const TYPE = { texto: { label: "Texto", icon: FileText }, video: { label: "Vídeo", icon: PlayCircle }, material: { label: "Material", icon: Paperclip } } as const;

/** Conteúdo do curso: módulos e aulas, com ordem, edição e exclusão (bloqueada quando já há conclusões). */
export function ContentEditor({ courseId, modules }: { courseId: string; modules: Module[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lessonDialog, setLessonDialog] = useState<{ moduleId: string; lesson?: Lesson } | null>(null);
  const [draft, setDraft] = useState<LessonDraft>({ title: "", type: "texto", content: "", videoUrl: "", durationMinutes: 10 });
  const [lessonErrors, setLessonErrors] = useState<Record<string, string>>({});
  const [moduleDialog, setModuleDialog] = useState<{ id?: string; title: string } | null>(null);
  const [removing, setRemoving] = useState<{ kind: "module" | "lesson"; id: string; title: string } | null>(null);

  async function run(key: string, fn: () => Promise<unknown>, ok?: string) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      if (ok) toast("success", ok);
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível concluir.");
      if (err instanceof ApiError && err.details) setLessonErrors(Object.fromEntries(Object.entries(err.details).map(([k, m]) => [k, m[0]])));
      return false;
    } finally {
      setBusy(null);
    }
  }

  function openLesson(moduleId: string, lesson?: Lesson) {
    setLessonErrors({});
    setError(null);
    setDraft(lesson ? { title: lesson.title, type: lesson.type, content: lesson.content, videoUrl: lesson.videoUrl ?? "", durationMinutes: lesson.durationMinutes } : { title: "", type: "texto", content: "", videoUrl: "", durationMinutes: 10 });
    setLessonDialog({ moduleId, lesson });
  }

  async function saveLesson() {
    if (!lessonDialog) return;
    const body = { ...draft, durationMinutes: draft.durationMinutes === "" ? 0 : draft.durationMinutes, videoUrl: draft.videoUrl || null };
    const ok = await run(
      "lesson",
      () => (lessonDialog.lesson ? api(`/rh/lessons/${lessonDialog.lesson.id}`, { method: "PUT", json: body }) : api(`/rh/course-modules/${lessonDialog.moduleId}/lessons`, { json: body })),
      lessonDialog.lesson ? "Aula atualizada." : "Aula adicionada.",
    );
    if (ok) setLessonDialog(null);
  }

  const total = modules.reduce((n, m) => n + m.lessons.length, 0);
  const minutes = modules.reduce((n, m) => n + m.lessons.reduce((s, l) => s + l.durationMinutes, 0), 0);

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.9375rem] text-muted">
          {modules.length} {modules.length === 1 ? "módulo" : "módulos"} · {total} {total === 1 ? "aula" : "aulas"} · {fmtMinutes(minutes)}
        </p>
        <Button variant="outline" icon={<Plus className="size-5" aria-hidden />} onClick={() => setModuleDialog({ title: "" })}>
          Novo módulo
        </Button>
      </div>
      {error && !lessonDialog && !moduleDialog && <Alert kind="error">{error}</Alert>}
      {modules.map((m, mi) => (
        <Card key={m.id} className="p-4 sm:p-5" aria-labelledby={`mod-${m.id}`}>
          <div className="flex items-center gap-1">
            <h2 id={`mod-${m.id}`} className="min-w-0 flex-1 text-lg font-bold text-ink">
              <span className="font-mono text-sm text-muted">Módulo {mi + 1} · </span>
              {m.title}
            </h2>
            <IconButton label={`Subir módulo ${m.title}`} disabled={mi === 0 || !!busy} onClick={() => run(`mm-${m.id}`, () => api(`/rh/course-modules/${m.id}/move`, { json: { dir: -1 } }))}>
              <ArrowUp className="size-4" aria-hidden />
            </IconButton>
            <IconButton label={`Descer módulo ${m.title}`} disabled={mi === modules.length - 1 || !!busy} onClick={() => run(`mm-${m.id}`, () => api(`/rh/course-modules/${m.id}/move`, { json: { dir: 1 } }))}>
              <ArrowDown className="size-4" aria-hidden />
            </IconButton>
            <IconButton label={`Renomear módulo ${m.title}`} onClick={() => setModuleDialog({ id: m.id, title: m.title })}>
              <Pencil className="size-4" aria-hidden />
            </IconButton>
            <IconButton label={`Excluir módulo ${m.title}`} onClick={() => setRemoving({ kind: "module", id: m.id, title: m.title })}>
              <Trash2 className="size-4 text-red-700" aria-hidden />
            </IconButton>
          </div>
          {m.lessons.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Nenhuma aula neste módulo.</p>
          ) : (
            <ol className="mt-3 divide-y divide-line rounded-xl border border-line">
              {m.lessons.map((l, li) => {
                const T = TYPE[l.type];
                return (
                  <li key={l.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                    <T.icon className="size-5 shrink-0 text-brand-600" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">
                        {li + 1}. {l.title}
                      </span>
                      <span className="block text-sm text-muted">
                        {T.label} · {l.durationMinutes} min{l.completions ? ` · ${l.completions} ${l.completions === 1 ? "conclusão" : "conclusões"}` : ""}
                      </span>
                    </span>
                    <IconButton label={`Subir aula ${l.title}`} disabled={li === 0 || !!busy} onClick={() => run(`ml-${l.id}`, () => api(`/rh/lessons/${l.id}/move`, { json: { dir: -1 } }))}>
                      <ArrowUp className="size-4" aria-hidden />
                    </IconButton>
                    <IconButton label={`Descer aula ${l.title}`} disabled={li === m.lessons.length - 1 || !!busy} onClick={() => run(`ml-${l.id}`, () => api(`/rh/lessons/${l.id}/move`, { json: { dir: 1 } }))}>
                      <ArrowDown className="size-4" aria-hidden />
                    </IconButton>
                    <IconButton label={`Editar aula ${l.title}`} onClick={() => openLesson(m.id, l)}>
                      <Pencil className="size-4" aria-hidden />
                    </IconButton>
                    <IconButton label={`Excluir aula ${l.title}`} onClick={() => setRemoving({ kind: "lesson", id: l.id, title: l.title })}>
                      <Trash2 className="size-4 text-red-700" aria-hidden />
                    </IconButton>
                  </li>
                );
              })}
            </ol>
          )}
          <Button variant="ghost" size="sm" className="mt-2" icon={<Plus className="size-4" aria-hidden />} onClick={() => openLesson(m.id)}>
            Adicionar aula
          </Button>
        </Card>
      ))}

      <Dialog
        open={!!lessonDialog}
        onClose={() => setLessonDialog(null)}
        title={lessonDialog?.lesson ? "Editar aula" : "Nova aula"}
        className="max-w-2xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setLessonDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={saveLesson} loading={busy === "lesson"}>
              Salvar aula
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error && <Alert kind="error">{error}</Alert>}
          <Field label="Título" error={lessonErrors.title} required>
            {({ id, describedBy, invalid }) => <Input id={id} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={140} aria-describedby={describedBy} invalid={invalid} />}
          </Field>
          <fieldset>
            <legend className="text-sm font-semibold text-ink">Tipo</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(Object.keys(TYPE) as Array<keyof typeof TYPE>).map((k) => {
                const T = TYPE[k];
                return (
                  <label key={k} className={cn("flex cursor-pointer items-center gap-2 rounded-xl border p-3", draft.type === k ? "border-brand-600 bg-brand-50" : "border-line")}>
                    <input type="radio" name="lesson-type" checked={draft.type === k} onChange={() => setDraft({ ...draft, type: k })} className="size-4 accent-[var(--color-brand-700)]" />
                    <T.icon className="size-4" aria-hidden /> {T.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
          {draft.type === "video" && (
            <Field label="Link do vídeo" hint="YouTube ou Vimeo. Ex.: https://youtu.be/… (convertido para o player sem rastreamento)." error={lessonErrors.videoUrl} required>
              {({ id, describedBy, invalid }) => <Input id={id} type="url" value={draft.videoUrl} onChange={(e) => setDraft({ ...draft, videoUrl: e.target.value })} aria-describedby={describedBy} invalid={invalid} />}
            </Field>
          )}
          <Field label={draft.type === "video" ? "Texto de apoio (opcional)" : "Conteúdo"} hint={draft.type === "material" ? "Orientações e links do material. Aceita ## títulos, - listas e **negrito**." : "Aceita ## títulos, - listas e **negrito**."} error={lessonErrors.content} required={draft.type !== "video"}>
            {({ id, describedBy, invalid }) => <Textarea id={id} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} maxLength={20000} rows={8} aria-describedby={describedBy} invalid={invalid} />}
          </Field>
          <Field label="Duração estimada (minutos)" error={lessonErrors.durationMinutes} required className="sm:max-w-xs">
            {({ id, describedBy, invalid }) => (
              <Input id={id} type="number" min={1} max={600} value={draft.durationMinutes} onChange={(e) => setDraft({ ...draft, durationMinutes: e.target.value ? Number(e.target.value) : "" })} aria-describedby={describedBy} invalid={invalid} />
            )}
          </Field>
          {lessonDialog?.lesson && lessonDialog.lesson.completions > 0 && <Badge tone="amber">Já concluída por {lessonDialog.lesson.completions} pessoa(s): alterações valem para todos.</Badge>}
        </div>
      </Dialog>

      <Dialog
        open={!!moduleDialog}
        onClose={() => setModuleDialog(null)}
        title={moduleDialog?.id ? "Renomear módulo" : "Novo módulo"}
        footer={
          <>
            <Button variant="outline" onClick={() => setModuleDialog(null)}>
              Cancelar
            </Button>
            <Button
              loading={busy === "module"}
              onClick={async () => {
                const ok = await run("module", () => (moduleDialog!.id ? api(`/rh/course-modules/${moduleDialog!.id}`, { method: "PUT", json: { title: moduleDialog!.title } }) : api(`/rh/courses/${courseId}/modules`, { json: { title: moduleDialog!.title } })), "Módulo salvo.");
                if (ok) setModuleDialog(null);
              }}
            >
              Salvar
            </Button>
          </>
        }
      >
        {error && <Alert kind="error" className="mb-3">{error}</Alert>}
        <Field label="Nome do módulo" required>
          {({ id }) => <Input id={id} value={moduleDialog?.title ?? ""} onChange={(e) => setModuleDialog((d) => (d ? { ...d, title: e.target.value } : d))} maxLength={120} />}
        </Field>
      </Dialog>

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          const r = removing!;
          await run("remove", () => api(r.kind === "module" ? `/rh/course-modules/${r.id}` : `/rh/lessons/${r.id}`, { method: "DELETE" }), r.kind === "module" ? "Módulo excluído." : "Aula excluída.");
          setRemoving(null);
        }}
        loading={busy === "remove"}
        tone="danger"
        title={removing?.kind === "module" ? "Excluir módulo?" : "Excluir aula?"}
        description={removing ? `“${removing.title}”${removing.kind === "module" ? " e todas as suas aulas" : ""} serão excluídos. Não é possível excluir conteúdo que já foi concluído por colaboradores.` : undefined}
        confirmLabel="Excluir"
      />
    </div>
  );
}
