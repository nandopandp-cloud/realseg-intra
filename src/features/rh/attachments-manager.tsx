"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, Paperclip, Trash2, Upload } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { FileUpload } from "@/components/ui/file-upload";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api-client";
import { fmtFileSize } from "@/lib/format";

type Item = { id: string; name: string; sizeBytes: number };

/**
 * Lista de anexos com envio e remoção. `apiBase` é o caminho da API (ex.: /rh/announcements/<id>/attachments);
 * downloads usam `/api/v1${apiBase}/<fileId>`.
 */
export function AttachmentsManager({ apiBase, items, max = 10, title = "Anexos", hint }: { apiBase: string; items: Item[]; max?: number; title?: string; hint?: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<Item | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();
  const room = max - items.length;

  async function upload() {
    if (!files.length) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    try {
      await api(apiBase, { formData: fd });
      setFiles([]);
      toast("success", files.length === 1 ? "Anexo enviado." : `${files.length} anexos enviados.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível enviar.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!removing) return;
    setBusy(true);
    try {
      await api(`${apiBase}/${removing.id}`, { method: "DELETE" });
      toast("success", "Anexo removido.");
      setRemoving(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível remover.");
      setRemoving(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="anexos-titulo">
      <h2 id="anexos-titulo" className="text-lg font-bold text-ink">
        {title}
      </h2>
      {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      {items.length > 0 && (
        <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
          {items.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-3 py-2">
              <Paperclip className="size-4 shrink-0 text-muted" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-[0.9375rem] text-ink">
                {a.name} <span className="text-sm text-muted">({fmtFileSize(a.sizeBytes)})</span>
              </span>
              <a href={`/api/v1${apiBase}/${a.id}`} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-canvas" aria-label={`Baixar ${a.name}`}>
                <Download className="size-4" aria-hidden />
              </a>
              <IconButton label={`Remover ${a.name}`} onClick={() => setRemoving(a)}>
                <Trash2 className="size-4 text-red-700" aria-hidden />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      {room > 0 ? (
        <div className="mt-3 flex flex-col gap-3">
          <FileUpload label={items.length ? "Adicionar arquivos" : "Arquivos"} files={files} onChange={setFiles} max={room} allowCamera={false} error={error ?? undefined} />
          {files.length > 0 && (
            <div>
              <Button onClick={upload} loading={busy} icon={<Upload className="size-4" aria-hidden />} size="sm">
                Enviar {files.length === 1 ? "anexo" : `${files.length} anexos`}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">Limite de {max} anexos atingido.</p>
      )}
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
        loading={busy}
        tone="danger"
        title="Remover anexo?"
        description={removing ? `“${removing.name}” deixará de aparecer para os colaboradores.` : undefined}
        confirmLabel="Remover"
      />
    </section>
  );
}
