"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { ChevronDown, CircleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-[var(--radius-control)] border border-line-strong bg-surface px-3.5 text-base text-ink placeholder:text-muted transition-colors focus:border-brand-600 focus:outline-none focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-focus aria-[invalid=true]:border-red-700 disabled:bg-field disabled:text-muted";

type FieldProps = {
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: (ids: { id: string; describedBy?: string; invalid: boolean; required: boolean }) => ReactNode;
  className?: string;
  labelHidden?: boolean;
};

/** Associa label, dica e erro ao controle (aria-describedby / aria-invalid). */
export function Field({ label, hint, error, required, children, className, labelHidden }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className={cn("flex items-baseline gap-0.5", labelHidden && "sr-only")}>
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
        </label>
        {required && (
          <span className="text-sm text-red-700" aria-hidden>
            *
          </span>
        )}
      </div>
      {children({ id, describedBy, invalid: !!error, required: !!required })}
      {hint && !error && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm font-medium text-red-700">
          <CircleAlert className="mt-0.5 size-4" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return <input ref={ref} aria-invalid={invalid || undefined} className={cn(control, "min-h-12", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea(
  { className, invalid, ...props },
  ref,
) {
  return <textarea ref={ref} aria-invalid={invalid || undefined} className={cn(control, "min-h-32 py-3 leading-relaxed", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(function Select(
  { className, invalid, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select ref={ref} aria-invalid={invalid || undefined} className={cn(control, "min-h-12 appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-muted" aria-hidden />
    </div>
  );
});

/** Interruptor acessível (role="switch"). */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <span id={`${id}-l`} className="block text-[0.9375rem] font-semibold text-ink">
          {label}
        </span>
        {description && (
          <span id={`${id}-d`} className="block text-sm text-muted">
            {description}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={description ? `${id}-d` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60",
          checked ? "bg-brand-700" : "bg-line-strong",
        )}
      >
        <span className={cn("inline-block size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-6" : "translate-x-1")} />
        <span className="sr-only">{checked ? "Ativado" : "Desativado"}</span>
      </button>
    </div>
  );
}
