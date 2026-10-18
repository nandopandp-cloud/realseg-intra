"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { cn } from "@/lib/cn";

type Toast = { id: number; kind: "success" | "error"; message: string };
const ToastContext = createContext<(kind: Toast["kind"], message: string) => void>(() => {});

/** Feedback de ações anunciado por leitores de tela (aria-live). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const push = useCallback((kind: Toast["kind"], message: string) => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, kind, message }]);
  }, []);
  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastContext value={push}>
      {children}
      <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:pr-6">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDone={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext>
  );
}

function ToastItem({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 6000);
    return () => clearTimeout(t);
  }, [onDone]);
  const Icon = toast.kind === "success" ? CircleCheck : CircleAlert;
  return (
    <div
      role={toast.kind === "error" ? "alert" : "status"}
      className={cn(
        "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border bg-surface p-4 text-[0.9375rem] shadow-[var(--shadow-raised)]",
        toast.kind === "success" ? "border-brand-200" : "border-red-100",
      )}
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", toast.kind === "success" ? "text-brand-600" : "text-red-700")} aria-hidden />
      <p className="flex-1 text-ink">{toast.message}</p>
      <button type="button" onClick={onDone} className="-m-2 rounded-full p-2 text-muted hover:text-ink" aria-label="Fechar aviso">
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}

export const useToast = () => useContext(ToastContext);
