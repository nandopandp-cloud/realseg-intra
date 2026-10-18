"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button, IconButton } from "./button";

/**
 * Modal acessível sobre <dialog> nativo: foco preso, Esc fecha, fundo inerte.
 * `variant="sheet"` vira folha inferior no celular (drawer).
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = "modal",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  variant?: "modal" | "sheet";
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-t`}
      aria-describedby={description ? `${id}-d` : undefined}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-surface p-0 text-ink shadow-[var(--shadow-raised)] backdrop:bg-navy-950/50",
        variant === "sheet" && "max-lg:mb-0 max-lg:w-full max-lg:max-w-none max-lg:rounded-b-none",
        className,
      )}
    >
      {open && (
        <div className="flex flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
            <div>
              <h2 id={`${id}-t`} className="text-lg font-bold text-ink">
                {title}
              </h2>
              {description && (
                <div id={`${id}-d`} className="mt-1 text-[0.9375rem] text-muted">
                  {description}
                </div>
              )}
            </div>
            <IconButton label="Fechar" onClick={onClose} className="-mt-1 -mr-2">
              <X className="size-5" aria-hidden />
            </IconButton>
          </div>
          {children && <div className="px-5 py-5 sm:px-6">{children}</div>}
          {footer && <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end sm:px-6">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

/** Confirmação explícita para ações relevantes/irreversíveis. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  tone = "primary",
  loading,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  tone?: "primary" | "danger";
  loading?: boolean;
  children?: ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Voltar
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
