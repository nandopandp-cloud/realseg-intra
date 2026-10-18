"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CircleCheck, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api-client";

export function EnrollButton({ slug, label }: { slug: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();
  async function go() {
    setBusy(true);
    try {
      const r = await api<{ resumeLessonId: string | null }>(`/courses/${slug}/enroll`, { method: "POST" });
      router.push(r.resumeLessonId ? `/cursos/${slug}/aulas/${r.resumeLessonId}` : `/cursos/${slug}`);
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Não foi possível iniciar o curso.");
      setBusy(false);
    }
  }
  return (
    <Button size="lg" onClick={go} loading={busy} icon={<Play className="size-5 fill-current" aria-hidden />}>
      {label}
    </Button>
  );
}

export function CompleteLessonButton({ lessonId, completed, nextHref, courseHref }: { lessonId: string; completed: boolean; nextHref: string | null; courseHref: string }) {
  const [done, setDone] = useState(completed);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ percent: number; completedNow: boolean; certificateId: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function complete() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ percent: number; completedNow: boolean; certificateId: string | null }>(`/lessons/${lessonId}/complete`, { method: "POST" });
      setDone(true);
      setResult(r);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível registrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <Alert kind="error">{error}</Alert>}
      {result?.completedNow && (
        <Alert kind="success" title="Parabéns! Curso concluído.">
          {result.certificateId ? (
            <>
              Seu certificado foi emitido.{" "}
              <a href={`/cursos/certificados/${result.certificateId}`} className="font-semibold underline">
                Ver certificado
              </a>
            </>
          ) : (
            "Sua conclusão foi registrada."
          )}
        </Alert>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        {done ? (
          <p className="inline-flex min-h-11 items-center gap-2 font-semibold text-green-700" role="status">
            <CircleCheck className="size-5" aria-hidden /> Aula concluída{result ? ` • ${result.percent}% do curso` : ""}
          </p>
        ) : (
          <Button size="lg" onClick={complete} loading={busy} icon={<CircleCheck className="size-5" aria-hidden />}>
            Concluir aula
          </Button>
        )}
        {done && (
          <Button size="lg" variant={nextHref ? "primary" : "outline"} onClick={() => router.push(nextHref ?? courseHref)} iconRight={<ArrowRight className="size-5" aria-hidden />}>
            {nextHref ? "Próxima aula" : "Voltar ao curso"}
          </Button>
        )}
      </div>
    </div>
  );
}
