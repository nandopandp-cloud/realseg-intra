"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, CalendarPlus, Eye, Pencil, PencilLine, RotateCcw, Save, Send, XCircle } from "lucide-react";
import { Button, ButtonLink, IconButton } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Alert, Card } from "@/components/ui/primitives";
import { RichText } from "@/components/ui/rich-text";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { articleSchema, TONES } from "@/lib/validation/rh";

export type ArticleValue = { title: string; summary: string; body: string; categorySlug: string; type: "artigo" | "tutorial" | "faq"; icon: string; color: string; ticketCategorySlug: string };
export const EMPTY_ARTICLE: ArticleValue = { title: "", summary: "", body: "", categorySlug: "", type: "artigo", icon: "file-text", color: "teal", ticketCategorySlug: "" };

/** Artigo da central de ajuda: texto com pré-visualização, categoria, tipo e área sugerida para "Falar com o suporte". */
export function ArticleForm({
  id,
  slug,
  status,
  initial,
  categories,
  ticketCategories,
  icons,
}: {
  id?: string;
  slug?: string;
  status?: "draft" | "published" | "archived";
  initial: ArticleValue;
  categories: Array<{ slug: string; name: string }>;
  ticketCategories: Array<{ slug: string; name: string }>;
  icons: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [preview, setPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const set = <K extends keyof ArticleValue>(k: K, val: ArticleValue[K]) => setV((x) => ({ ...x, [k]: val }));

  async function save() {
    const parsed = articleSchema.safeParse({ ...v, ticketCategorySlug: v.ticketCategorySlug || null });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      setFormError("Revise os campos destacados.");
      return false;
    }
    setErrors({});
    setFormError(null);
    setBusy("save");
    try {
      if (id) {
        await api(`/rh/help/articles/${id}`, { method: "PUT", json: parsed.data });
        toast("success", "Artigo salvo.");
        router.refresh();
      } else {
        const r = await api<{ id: string }>("/rh/help/articles", { json: parsed.data });
        toast("success", "Artigo criado como rascunho.");
        router.push(`/rh/ajuda/artigos/${r.id}`);
      }
      return true;
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function changeStatus(to: "draft" | "published" | "archived", ok: string) {
    setBusy(to);
    try {
      await api(`/rh/help/articles/${id}/status`, { json: { status: to } });
      toast("success", ok);
      router.refresh();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Não foi possível concluir.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-6">
        {formError && <Alert kind="error">{formError}</Alert>}
        <Card className="flex flex-col gap-4 p-5">
          <Field label="Título" error={errors.title} required>
            {({ id: fid, describedBy, invalid }) => <Input id={fid} value={v.title} onChange={(e) => set("title", e.target.value)} maxLength={140} aria-describedby={describedBy} invalid={invalid} />}
          </Field>
          <Field label="Resumo" error={errors.summary} required>
            {({ id: fid, describedBy, invalid }) => <Textarea id={fid} value={v.summary} onChange={(e) => set("summary", e.target.value)} maxLength={300} rows={2} className="min-h-20" aria-describedby={describedBy} invalid={invalid} />}
          </Field>
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-ink">
                Texto<span className="ml-0.5 text-red-700" aria-hidden>*</span>
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
              <div className="mt-2 min-h-60 rounded-[var(--radius-control)] border border-line bg-canvas/40 p-4">{v.body.trim() ? <RichText text={v.body} /> : <p className="text-muted">Nada para pré-visualizar.</p>}</div>
            ) : (
              <Field label="Texto" labelHidden error={errors.body} hint={<>Aceita <code>## Título</code>, <code>- item</code> e <code>**negrito**</code>.</>}>
                {({ id: fid, describedBy, invalid }) => <Textarea id={fid} value={v.body} onChange={(e) => set("body", e.target.value)} maxLength={20000} rows={14} className="mt-2" aria-describedby={describedBy} invalid={invalid} />}
              </Field>
            )}
          </div>
        </Card>
      </div>
      <aside className="flex flex-col gap-6">
        <Card className="flex flex-col gap-3 p-5">
          <Button onClick={save} loading={busy === "save"} icon={<Save className="size-5" aria-hidden />}>
            {id ? "Salvar" : "Criar rascunho"}
          </Button>
          {id && status === "draft" && (
            <Button variant="outline" loading={busy === "published"} onClick={() => changeStatus("published", "Artigo publicado na central de ajuda.")} icon={<Send className="size-5" aria-hidden />}>
              Publicar
            </Button>
          )}
          {id && status === "published" && (
            <>
              <ButtonLink href={`/ajuda/artigos/${slug}`} variant="outline" icon={<Eye className="size-5" aria-hidden />}>
                Ver como colaborador
              </ButtonLink>
              <Button variant="ghost" loading={busy === "archived"} onClick={() => changeStatus("archived", "Artigo arquivado.")} icon={<Archive className="size-5" aria-hidden />}>
                Arquivar
              </Button>
            </>
          )}
          {id && status === "archived" && (
            <Button variant="outline" loading={busy === "draft"} onClick={() => changeStatus("draft", "Artigo voltou para rascunho.")} icon={<RotateCcw className="size-5" aria-hidden />}>
              Restaurar como rascunho
            </Button>
          )}
        </Card>
        <Card className="flex flex-col gap-4 p-5">
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
          <Field label="Tipo">
            {({ id: fid }) => (
              <Select id={fid} value={v.type} onChange={(e) => set("type", e.target.value as ArticleValue["type"])}>
                <option value="artigo">Artigo</option>
                <option value="tutorial">Tutorial</option>
                <option value="faq">Pergunta frequente</option>
              </Select>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ícone">
              {({ id: fid }) => (
                <Select id={fid} value={v.icon} onChange={(e) => set("icon", e.target.value)}>
                  {icons.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Cor">
              {({ id: fid }) => (
                <Select id={fid} value={v.color} onChange={(e) => set("color", e.target.value)}>
                  {TONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <Field label="Área para “Falar com o suporte”" hint="Opcional. A solicitação a partir do artigo já vem com esta área.">
            {({ id: fid, describedBy }) => (
              <Select id={fid} value={v.ticketCategorySlug} onChange={(e) => set("ticketCategorySlug", e.target.value)} aria-describedby={describedBy}>
                <option value="">Nenhuma</option>
                {ticketCategories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </Card>
      </aside>
    </div>
  );
}

type EventValue = { id?: string; title: string; description: string; location: string; start: string; end: string; unitId: string; announcementId: string; status?: "scheduled" | "cancelled" };

/** Evento da agenda (Home e Comunicados › Próximos eventos). Datas no horário de Brasília. */
export function EventDialogButton({ event, units, announcements }: { event?: EventValue; units: Array<{ id: string; name: string }>; announcements: Array<{ id: string; title: string }> }) {
  const router = useRouter();
  const toast = useToast();
  const empty: EventValue = { title: "", description: "", location: "", start: "", end: "", unitId: "", announcementId: "" };
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [v, setV] = useState<EventValue>(event ?? empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iso = (local: string) => (local ? new Date(`${local}:00-03:00`).toISOString() : null);

  async function save() {
    if (!v.title.trim() || !v.start) return setError("Informe o título e a data/hora de início.");
    setBusy(true);
    setError(null);
    try {
      const body = { title: v.title, description: v.description || null, location: v.location || null, startsAt: iso(v.start), endsAt: iso(v.end), unitId: v.unitId || null, announcementId: v.announcementId || null };
      await api(event?.id ? `/rh/events/${event.id}` : "/rh/events", { method: event?.id ? "PUT" : "POST", json: body });
      toast("success", "Evento salvo.");
      setOpen(false);
      if (!event) setV(empty);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }
  async function setStatus(status: "scheduled" | "cancelled") {
    setBusy(true);
    try {
      await api(`/rh/events/${event!.id}/status`, { json: { status } });
      toast("success", status === "cancelled" ? "Evento cancelado." : "Evento reativado.");
      setConfirm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível concluir.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {event ? (
        <div className="flex gap-1">
          <IconButton label={`Editar ${event.title}`} onClick={() => setOpen(true)}>
            <Pencil className="size-4" aria-hidden />
          </IconButton>
          {event.status === "cancelled" ? (
            <IconButton label={`Reativar ${event.title}`} onClick={() => setStatus("scheduled")}>
              <RotateCcw className="size-4" aria-hidden />
            </IconButton>
          ) : (
            <IconButton label={`Cancelar ${event.title}`} onClick={() => setConfirm(true)}>
              <XCircle className="size-4 text-red-700" aria-hidden />
            </IconButton>
          )}
        </div>
      ) : (
        <Button onClick={() => setOpen(true)} icon={<CalendarPlus className="size-5" aria-hidden />}>
          Novo evento
        </Button>
      )}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={event ? "Editar evento" : "Novo evento"}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} loading={busy}>
              Salvar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error && <Alert kind="error">{error}</Alert>}
          <Field label="Título" required>
            {({ id }) => <Input id={id} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} maxLength={120} />}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Início" required>
              {({ id }) => <Input id={id} type="datetime-local" value={v.start} onChange={(e) => setV({ ...v, start: e.target.value })} />}
            </Field>
            <Field label="Término" hint="Opcional.">
              {({ id, describedBy }) => <Input id={id} type="datetime-local" value={v.end} onChange={(e) => setV({ ...v, end: e.target.value })} aria-describedby={describedBy} />}
            </Field>
          </div>
          <Field label="Local">
            {({ id }) => <Input id={id} value={v.location} onChange={(e) => setV({ ...v, location: e.target.value })} maxLength={120} />}
          </Field>
          <Field label="Unidade" hint="Vazio = todas as unidades.">
            {({ id, describedBy }) => (
              <Select id={id} value={v.unitId} onChange={(e) => setV({ ...v, unitId: e.target.value })} aria-describedby={describedBy}>
                <option value="">Todas as unidades</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Descrição">
            {({ id }) => <Textarea id={id} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} maxLength={1000} rows={2} className="min-h-20" />}
          </Field>
          <Field label="Comunicado relacionado" hint="Opcional. Leva ao comunicado com os detalhes.">
            {({ id, describedBy }) => (
              <Select id={id} value={v.announcementId} onChange={(e) => setV({ ...v, announcementId: e.target.value })} aria-describedby={describedBy}>
                <option value="">Nenhum</option>
                {announcements.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </Dialog>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={() => setStatus("cancelled")} loading={busy} tone="danger" title="Cancelar evento?" description="Ele sai da agenda dos colaboradores." confirmLabel="Cancelar evento" />
    </>
  );
}
