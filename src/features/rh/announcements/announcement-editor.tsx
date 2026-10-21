"use client";

import Link from "@/components/ui/app-link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Archive, CalendarClock, Copy, Eye, PencilLine, RotateCcw, Save, Send, Trash2 } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/form";
import { Alert, Card } from "@/components/ui/primitives";
import { RichText } from "@/components/ui/rich-text";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { announcementSchema, type AnnouncementInput, type AudienceValue } from "@/lib/validation/rh";
import { AudiencePicker, type AudienceOptions } from "../audience-picker";
import { CoverPicker } from "../cover-picker";
import { HighlightsEditor, TagsInput, type Highlight } from "../list-editors";

type Status = "draft" | "scheduled" | "published" | "archived";
export type EditorValue = Omit<AnnouncementInput, "highlights" | "audience" | "relevantChange"> & { highlights: Highlight[]; audience: AudienceValue };

export const EMPTY_ANNOUNCEMENT: EditorValue = {
  title: "",
  summary: "",
  body: "",
  categorySlug: "",
  coverImage: null,
  effectiveNote: null,
  highlights: [],
  tags: [],
  supportTicketCategory: null,
  isImportant: false,
  requiresAck: false,
  isFeatured: false,
  authorLabel: "Recursos Humanos",
  audience: { all: true, department: [], unit: [], job_position: [], job_family: [] },
};

/** Editor de comunicado: rascunho → publicação (agora ou agendada) → arquivo. Salva antes de publicar. */
export function AnnouncementEditor({
  id,
  status,
  initial,
  categories,
  ticketCategories,
  audienceOptions,
  canReport,
}: {
  id?: string;
  status?: Status;
  initial: EditorValue;
  categories: Array<{ slug: string; name: string }>;
  ticketCategories: Array<{ slug: string; name: string }>;
  audienceOptions: AudienceOptions;
  canReport?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState<EditorValue>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [relevant, setRelevant] = useState(false);
  const [dialog, setDialog] = useState<"publish" | "archive" | "delete" | null>(null);
  const [publishMode, setPublishMode] = useState<"now" | "schedule">("now");
  const [publishAt, setPublishAt] = useState("");
  const [notify, setNotify] = useState(true);
  const dirty = JSON.stringify(v) !== saved;
  const live = status === "published" || status === "scheduled";
  const set = <K extends keyof EditorValue>(k: K, val: EditorValue[K]) => setV((x) => ({ ...x, [k]: val }));

  const summaryLeft = useMemo(() => 300 - v.summary.length, [v.summary]);

  function validate(): AnnouncementInput | null {
    const parsed = announcementSchema.safeParse({ ...v, relevantChange: live ? relevant : undefined });
    if (parsed.success) {
      setErrors({});
      return parsed.data;
    }
    const errs: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const key = i.path[0] === "highlights" ? "highlights" : String(i.path[0]);
      errs[key] ??= i.message;
    }
    setErrors(errs);
    setFormError("Revise os campos destacados.");
    return null;
  }

  /** Salva (cria ou atualiza). Retorna o id ou null em caso de erro. */
  async function save(opts: { quiet?: boolean } = {}): Promise<string | null> {
    setFormError(null);
    const data = validate();
    if (!data) return null;
    setBusy("save");
    try {
      if (!id) {
        const r = await api<{ id: string }>("/rh/announcements", { json: data });
        setSaved(JSON.stringify(v));
        toast("success", "Rascunho criado.");
        router.push(`/rh/comunicados/${r.id}`);
        return r.id;
      }
      await api(`/rh/announcements/${id}`, { method: "PUT", json: data });
      setSaved(JSON.stringify(v));
      setRelevant(false);
      if (!opts.quiet) toast("success", live && data.relevantChange ? "Alterações salvas. Uma nova versão foi publicada." : "Alterações salvas.");
      router.refresh();
      return id;
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(Object.fromEntries(Object.entries(err.details).map(([k, m]) => [k.split(".")[0], m[0]])));
      setFormError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function run(key: string, path: string, ok: string, json: unknown = {}) {
    setBusy(key);
    setFormError(null);
    try {
      const r = await api<{ id?: string } | undefined>(`/rh/announcements/${id}/${path}`, { json });
      toast("success", ok);
      setDialog(null);
      if (key === "duplicate" && r?.id) router.push(`/rh/comunicados/${r.id}`);
      else router.refresh();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Não foi possível concluir.");
      setDialog(null);
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    if (dirty && !(await save({ quiet: true }))) return setDialog(null);
    const at = publishMode === "schedule" && publishAt ? new Date(publishAt).toISOString() : undefined;
    await run("publish", "publish", publishMode === "now" ? "Comunicado publicado." : "Publicação agendada.", { mode: publishMode, publishAt: at, notify });
  }

  async function remove() {
    setBusy("delete");
    try {
      await api(`/rh/announcements/${id}`, { method: "DELETE" });
      toast("success", "Rascunho excluído.");
      router.push("/rh/comunicados");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Não foi possível excluir.");
      setDialog(null);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="flex min-w-0 flex-col gap-6">
        {formError && <Alert kind="error">{formError}</Alert>}
        {status === "archived" && <Alert kind="info">Comunicado arquivado: não aparece para os colaboradores. Restaure-o como rascunho para editar.</Alert>}

        <Card className="flex flex-col gap-5 p-5">
          <h2 className="text-lg font-bold text-ink">Conteúdo</h2>
          <Field label="Título" error={errors.title} required>
            {({ id: fid, describedBy, invalid }) => <Input id={fid} value={v.title} onChange={(e) => set("title", e.target.value)} maxLength={140} aria-describedby={describedBy} invalid={invalid} />}
          </Field>
          <Field label="Resumo" hint={`Aparece na lista e na notificação. ${summaryLeft} caracteres restantes.`} error={errors.summary} required>
            {({ id: fid, describedBy, invalid }) => <Textarea id={fid} value={v.summary} onChange={(e) => set("summary", e.target.value)} maxLength={300} rows={2} className="min-h-20" aria-describedby={describedBy} invalid={invalid} />}
          </Field>
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-ink">
                Texto do comunicado<span className="ml-0.5 text-red-700" aria-hidden>*</span>
              </span>
              <div role="tablist" aria-label="Modo do texto" className="inline-flex rounded-lg border border-line p-0.5">
                {[
                  { p: false, label: "Escrever", icon: PencilLine },
                  { p: true, label: "Pré-visualizar", icon: Eye },
                ].map((o) => (
                  <button key={o.label} type="button" role="tab" aria-selected={preview === o.p} onClick={() => setPreview(o.p)} className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium", preview === o.p ? "bg-brand-700 text-white" : "text-muted hover:text-ink")}>
                    <o.icon className="size-4" aria-hidden /> {o.label}
                  </button>
                ))}
              </div>
            </div>
            {preview ? (
              <div className="mt-2 min-h-60 rounded-[var(--radius-control)] border border-line bg-canvas/40 p-4">{v.body.trim() ? <RichText text={v.body} /> : <p className="text-muted">Nada para pré-visualizar ainda.</p>}</div>
            ) : (
              <Field label="Texto do comunicado" labelHidden error={errors.body} hint={<>Formatação: <code>## Título</code> em uma linha, <code>- item</code> para listas, <code>**negrito**</code>. Deixe uma linha em branco entre parágrafos.</>}>
                {({ id: fid, describedBy, invalid }) => <Textarea id={fid} value={v.body} onChange={(e) => set("body", e.target.value)} maxLength={20000} rows={14} className="mt-2 min-h-60 font-[inherit]" aria-describedby={describedBy} invalid={invalid} />}
              </Field>
            )}
          </div>
          <Field label="Quando começa a valer?" hint="Opcional. Ex.: A partir de 1º de novembro, para todas as unidades." error={errors.effectiveNote}>
            {({ id: fid, describedBy, invalid }) => <Input id={fid} value={v.effectiveNote ?? ""} onChange={(e) => set("effectiveNote", e.target.value || null)} maxLength={300} aria-describedby={describedBy} invalid={invalid} />}
          </Field>
          <HighlightsEditor value={v.highlights} onChange={(h) => set("highlights", h)} error={errors.highlights} />
        </Card>

        <Card className="p-5">
          <CoverPicker value={v.coverImage} onChange={(c) => set("coverImage", c)} />
        </Card>

        <Card className="p-5">
          <AudiencePicker value={v.audience} onChange={(a) => set("audience", a)} options={audienceOptions} error={errors.audience} />
        </Card>
      </div>

      <aside className="flex flex-col gap-6" aria-label="Publicação e configurações">
        <Card className="flex flex-col gap-3 p-5 xl:sticky xl:top-28">
          <h2 className="text-lg font-bold text-ink">Publicação</h2>
          {dirty && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">Há alterações não salvas.</p>}
          {live && (
            <label className="flex items-start gap-3 rounded-lg border border-line p-3 text-sm">
              <input type="checkbox" checked={relevant} onChange={(e) => setRelevant(e.target.checked)} className="mt-0.5 size-5 accent-[var(--color-brand-700)]" />
              <span>
                <span className="block font-semibold text-ink">Alteração relevante</span>
                <span className="text-muted">Gera nova versão: leituras e ciências recomeçam e o público é avisado.</span>
              </span>
            </label>
          )}
          {status !== "archived" && (
            <Button onClick={() => save()} loading={busy === "save"} variant={live ? "primary" : "outline"} icon={<Save className="size-5" aria-hidden />} disabled={!!id && !dirty && !relevant}>
              {id ? (live ? "Salvar alterações" : "Salvar rascunho") : "Criar rascunho"}
            </Button>
          )}
          {id && (status === "draft" || status === "scheduled") && (
            <Button onClick={() => setDialog("publish")} icon={<Send className="size-5" aria-hidden />}>
              {status === "scheduled" ? "Publicar agora ou reagendar" : "Publicar"}
            </Button>
          )}
          {!id && <p className="text-sm text-muted">Depois de criar o rascunho você pode anexar arquivos e publicar.</p>}
          {id && status === "published" && (
            <ButtonLink href={`/comunicados/${id}`} variant="outline" icon={<Eye className="size-5" aria-hidden />}>
              Ver como colaborador
            </ButtonLink>
          )}
          {id && canReport && status !== "draft" && (
            <ButtonLink href={`/rh/comunicados/${id}/leitura`} variant="outline">
              Relatório de leitura
            </ButtonLink>
          )}
          {id && (
            <div className="mt-1 flex flex-wrap gap-2 border-t border-line pt-3">
              <Button size="sm" variant="ghost" icon={<Copy className="size-4" aria-hidden />} loading={busy === "duplicate"} onClick={() => run("duplicate", "duplicate", "Cópia criada como rascunho.")}>
                Duplicar
              </Button>
              {live && (
                <Button size="sm" variant="ghost" icon={<Archive className="size-4" aria-hidden />} onClick={() => setDialog("archive")}>
                  Arquivar
                </Button>
              )}
              {status === "archived" && (
                <Button size="sm" variant="ghost" icon={<RotateCcw className="size-4" aria-hidden />} loading={busy === "restore"} onClick={() => run("restore", "restore", "Comunicado restaurado como rascunho.")}>
                  Restaurar
                </Button>
              )}
              {status === "draft" && (
                <Button size="sm" variant="ghost" className="text-red-700" icon={<Trash2 className="size-4" aria-hidden />} onClick={() => setDialog("delete")}>
                  Excluir rascunho
                </Button>
              )}
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <h2 className="text-lg font-bold text-ink">Configurações</h2>
          <Field label="Categoria" error={errors.categorySlug} required>
            {({ id: fid, describedBy, invalid }) => (
              <Select id={fid} value={v.categorySlug} onChange={(e) => set("categorySlug", e.target.value)} aria-describedby={describedBy} invalid={invalid}>
                <option value="">Escolha…</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Assinado por" error={errors.authorLabel} required>
            {({ id: fid, describedBy, invalid }) => <Input id={fid} value={v.authorLabel} onChange={(e) => set("authorLabel", e.target.value)} maxLength={60} aria-describedby={describedBy} invalid={invalid} />}
          </Field>
          <div className="divide-y divide-line">
            <Switch checked={v.isImportant} onChange={(b) => set("isImportant", b)} label="Importante" description="Destacado na Home e na aba Importantes." />
            <Switch checked={v.requiresAck} onChange={(b) => set("requiresAck", b)} label="Exige confirmação de ciência" description="O colaborador precisa confirmar que leu e entendeu." />
            <Switch checked={v.isFeatured} onChange={(b) => set("isFeatured", b)} label="Destaque da semana" description="Aparece no quadro lateral da central de comunicados." />
          </div>
          <Field label="Área para dúvidas" hint="Opcional. O quadro “Dúvidas?” abre uma solicitação para esta área.">
            {({ id: fid, describedBy }) => (
              <Select id={fid} value={v.supportTicketCategory ?? ""} onChange={(e) => set("supportTicketCategory", e.target.value || null)} aria-describedby={describedBy}>
                <option value="">Nenhuma</option>
                {ticketCategories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <TagsInput value={v.tags} onChange={(t) => set("tags", t)} />
        </Card>
      </aside>

      <Dialog
        open={dialog === "publish"}
        onClose={() => setDialog(null)}
        title="Publicar comunicado"
        description={dirty ? "As alterações não salvas serão salvas antes da publicação." : "Escolha quando o comunicado ficará visível para o público."}
        footer={
          <>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Voltar
            </Button>
            <Button onClick={publish} loading={busy === "publish" || busy === "save"} icon={publishMode === "now" ? <Send className="size-5" aria-hidden /> : <CalendarClock className="size-5" aria-hidden />}>
              {publishMode === "now" ? "Publicar agora" : "Agendar"}
            </Button>
          </>
        }
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Quando publicar</legend>
          {[
            { m: "now" as const, t: "Publicar agora", d: "Fica visível imediatamente." },
            { m: "schedule" as const, t: "Agendar", d: "Fica visível na data e hora escolhidas." },
          ].map((o) => (
            <label key={o.m} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3", publishMode === o.m ? "border-brand-600 bg-brand-50" : "border-line")}>
              <input type="radio" name="publish-mode" checked={publishMode === o.m} onChange={() => setPublishMode(o.m)} className="mt-1 size-5 accent-[var(--color-brand-700)]" />
              <span>
                <span className="block font-semibold text-ink">{o.t}</span>
                <span className="block text-sm text-muted">{o.d}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {publishMode === "schedule" && (
          <Field label="Data e hora da publicação" className="mt-4" required>
            {({ id: fid }) => <Input id={fid} type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />}
          </Field>
        )}
        {publishMode === "now" && (
          <label className="mt-4 flex items-start gap-3 text-sm">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="mt-0.5 size-5 accent-[var(--color-brand-700)]" />
            <span>
              <span className="block font-semibold text-ink">Avisar o público na intranet</span>
              <span className="text-muted">Envia uma notificação para cada colaborador do público.</span>
            </span>
          </label>
        )}
      </Dialog>

      <ConfirmDialog
        open={dialog === "archive"}
        onClose={() => setDialog(null)}
        onConfirm={() => run("archive", "archive", "Comunicado arquivado.")}
        loading={busy === "archive"}
        title="Arquivar comunicado?"
        description="Ele deixa de aparecer para os colaboradores. Leituras e ciências continuam registradas e você pode restaurá-lo depois."
        confirmLabel="Arquivar"
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        onConfirm={remove}
        loading={busy === "delete"}
        tone="danger"
        title="Excluir rascunho?"
        description="O rascunho e seus anexos serão removidos. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
      />
      {id && <span className="sr-only" aria-live="polite">{dirty ? "Há alterações não salvas." : ""}</span>}
      {!id && (
        <p className="text-sm text-muted xl:col-span-2">
          <Link href="/rh/comunicados" className="text-brand-700 hover:underline">
            Voltar para a lista
          </Link>
        </p>
      )}
    </div>
  );
}
