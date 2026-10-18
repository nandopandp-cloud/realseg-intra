import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-semibold transition-colors select-none disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:shrink-0";

const variants: Record<Variant, string> = {
  primary: "bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-800",
  secondary: "bg-brand-50 text-brand-700 hover:bg-brand-100",
  outline: "border border-line-strong bg-surface text-ink hover:bg-canvas",
  ghost: "text-ink hover:bg-canvas",
  subtle: "bg-field text-ink hover:bg-line",
  danger: "bg-red-700 text-white hover:bg-red-600",
};

// Alvos de toque ≥ 44px (md/lg). "sm" apenas em contextos densos no desktop.
const sizes: Record<Size, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-[0.9375rem]",
  lg: "min-h-12 px-6 text-base",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, iconRight, className, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClasses(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  );
});

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size; icon?: ReactNode; iconRight?: ReactNode };

export function ButtonLink({ variant = "primary", size = "md", icon, iconRight, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...props}>
      {icon}
      {children}
      {iconRight}
    </Link>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { label: string; variant?: Variant };

/** Botão só de ícone: o rótulo acessível é obrigatório. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = "ghost", className, children, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(base, variants[variant], "size-11 rounded-full p-0", className)}
      {...props}
    >
      {children}
    </button>
  );
});
