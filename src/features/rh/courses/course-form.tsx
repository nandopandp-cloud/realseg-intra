"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, Eye, RotateCcw, Save, Send } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/form";
import { Alert, Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api-client";
import { courseSchema, type AudienceValue } from "@/lib/validation/rh";
import { AudiencePicker, type AudienceOptions } from "../audience-picker";
import { CoverPicker } from "../cover-picker";

export type CourseFormValue = {
  title: string;
  slug: string;
  summary: string;
  description: string;
  categorySlug: string;
  coverImage: string | null;
  isMandatory: boolean;
  mandatoryDueDays: number | null;
  issuesCertificate: boolean;
  audience: AudienceValue;
};
export const EMPTY_COURSE: CourseFormValue = {
  title: "",
  slug: "",
  summary: "",
  description: "",
  categorySlug: "",
  coverImage: null,
  isMandatory: false,
  mandatoryDueDays: null,
  issuesCertificate: true,
  audience: { all: true, department: [], unit: [], job_position: [], job_family: [] },
};

const slugify = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

/** Dados do curso (catálogo): título, endereço, textos, categoria, capa, obrigatoriedade, certificado e público. */
export function CourseForm({ id, initial, categories, audienceOptions }: { id?: string; initial: CourseFormValue; categories: Array<{ slug: string; name: string }>; audienceOptions: AudienceOptions }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(!!id);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof CourseFormValue>(k: K, val: CourseFormValue[K]) => setV((x) => ({ ...x, [k]: val }));

  async function save() {
    setFormError(null);
    const parsed = courseSchema.safeParse(v);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      setFormError("Revise os campos destacados.");
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      if (id) {
        await api(`/rh/courses/${id}`, { method: "PUT", json: parsed.data });
        toast("success", "Curso atualizado.");
        router.refresh();
      } else {
        const r = await api<{ id: string }>("/rh/courses", { json: parsed.data });
        toast("success", "Curso criado como rascunho. Agora adicione as aulas.");
        router.push(`/rh/cursos/${r.id}?aba=conteudo`);
      }
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(Object.fromEntries(Object.entries(err.details).map(([k, m]) => [k.split(".")[0], m[0]])));
      setFormError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      {formError && <Alert kind="error">{formError}</Alert>}
      <Card className="flex flex-col gap-4 p-5">
        <h2 className="text-lg font-bold text-ink">Catálogo</h2>
        <Field label="Título" error={errors.title} required>
          {({ id: fid, describedBy, invalid }) => (
            <Input
              id={fid}
              value={v.title}
              maxLength={140}
              onChange={(e) => setV((x) => ({ ...x, title: e.target.value, slug: slugTouched ? x.slug : slugify(e.target.value) }))}
              aria-describedby={describedBy}
              invalid={invalid}
            />
          )}
        </Field>
        <Field label="Endereço" hint={`intranet/cursos/${v.slug || "…"}`} error={errors.slug} required>
          {({ id: fid, describedBy, invalid }) => (
            <Input
              id={fid}
              value={v.slug}
              maxLength={80}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", slugify(e.target.value));
              }}
              aria-describedby={describedBy}
              invalid={invalid}
            />
          )}
        </Field>
        <Field label="Resumo" hint="Aparece no card do curso." error={errors.summary} required>
          {({ id: fid, describedBy, invalid }) => <Textarea id={fid} value={v.summary} onChange={(e) => set("summary", e.target.value)} maxLength={300} rows={2} className="min-h-20" aria-describedby={describedBy} invalid={invalid} />}
        </Field>
        <Field label="Sobre o curso" hint="Texto da página do curso. Aceita ## títulos, - listas e **negrito**." error={errors.description} required>
          {({ id: fid, describedBy, invalid }) => <Textarea id={fid} value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={5000} rows={6} aria-describedby={describedBy} invalid={invalid} />}
        </Field>
        <Field label="Categoria" error={errors.categorySlug} required className="sm:max-w-sm">
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
      </Card>
      <Card className="p-5">
        <CoverPicker value={v.coverImage} onChange={(c) => set("coverImage", c)} />
      </Card>
      <Card className="flex flex-col gap-2 p-5">
        <h2 className="text-lg font-bold text-ink">Regras</h2>
        <div className="divide-y divide-line">
          <Switch checked={v.isMandatory} onChange={(b) => setV((x) => ({ ...x, isMandatory: b, mandatoryDueDays: b ? (x.mandatoryDueDays ?? 30) : null }))} label="Obrigatório" description="Aparece primeiro, com selo e prazo para concluir." />
          <Switch checked={v.issuesCertificate} onChange={(b) => set("issuesCertificate", b)} label="Emite certificado" description="Certificado com código de verificação ao concluir 100%." />
        </div>
        {v.isMandatory && (
          <Field label="Prazo para concluir (dias após a matrícula)" error={errors.mandatoryDueDays} required className="sm:max-w-xs">
            {({ id: fid, describedBy, invalid }) => <Input id={fid} type="number" min={1} max={365} value={v.mandatoryDueDays ?? ""} onChange={(e) => set("mandatoryDueDays", e.target.value ? Number(e.target.value) : null)} aria-describedby={describedBy} invalid={invalid} />}
          </Field>
        )}
      </Card>
      <Card className="p-5">
        <AudiencePicker value={v.audience} onChange={(a) => set("audience", a)} options={audienceOptions} error={errors.audience} hint="Somente quem estiver no público vê o curso no catálogo." />
      </Card>
      <div>
        <Button size="lg" onClick={save} loading={busy} icon={<Save className="size-5" aria-hidden />}>
          {id ? "Salvar alterações" : "Criar curso"}
        </Button>
      </div>
    </div>
  );
}

/** Publicar, voltar para rascunho, arquivar. */
export function CourseStatusActions({ id, slug, status }: { id: string; slug: string; status: "draft" | "published" | "archived" }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"archived" | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function go(to: "draft" | "published" | "archived", ok: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/rh/courses/${id}/status`, { json: { status: to } });
      toast("success", ok);
      setConfirm(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível concluir.");
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        {status === "published" && (
          <ButtonLink href={`/cursos/${slug}`} variant="outline" icon={<Eye className="size-5" aria-hidden />}>
            Ver no catálogo
          </ButtonLink>
        )}
        {status !== "published" && (
          <Button onClick={() => go("published", "Curso publicado no catálogo.")} loading={busy} icon={<Send className="size-5" aria-hidden />}>
            Publicar
          </Button>
        )}
        {status === "published" && (
          <Button variant="outline" onClick={() => setConfirm("archived")} icon={<Archive className="size-5" aria-hidden />}>
            Arquivar
          </Button>
        )}
        {status === "archived" && (
          <Button variant="outline" onClick={() => go("draft", "Curso voltou para rascunho.")} loading={busy} icon={<RotateCcw className="size-5" aria-hidden />}>
            Voltar para rascunho
          </Button>
        )}
      </div>
      {error && <p className="text-sm font-medium text-red-700" role="alert">{error}</p>}
      <ConfirmDialog
        open={confirm === "archived"}
        onClose={() => setConfirm(null)}
        onConfirm={() => go("archived", "Curso arquivado.")}
        loading={busy}
        title="Arquivar curso?"
        description="Sai do catálogo. Progresso, conclusões e certificados de quem já fez são preservados."
        confirmLabel="Arquivar"
      />
    </div>
  );
}
