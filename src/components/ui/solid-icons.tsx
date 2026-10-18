/** Ícones sólidos do "Acesso rápido" (estilo preenchido das referências). Decorativos: sempre aria-hidden. */
type P = { className?: string };

export function MegaphoneSolid({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M2.5 9.6c0-.9.7-1.6 1.6-1.6h4.6l6.9-3.9c.7-.4 1.6.1 1.6.9v13.9c0 .8-.9 1.3-1.6.9L8.7 15.9H8l1.2 3.5c.3.8-.3 1.6-1.1 1.6H6.6c-.5 0-1-.3-1.1-.8L4.1 15.9c-.9-.1-1.6-.8-1.6-1.6V9.6z" />
      <circle cx="20.2" cy="8.4" r="1.15" />
      <circle cx="20.2" cy="12" r="1.15" />
      <circle cx="20.2" cy="15.6" r="1.15" />
    </svg>
  );
}

export function DocumentSolid({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="currentColor" d="M6.2 2h8.1c.5 0 1 .2 1.4.6l3.7 3.7c.4.4.6.9.6 1.4v12.1c0 1.2-1 2.2-2.2 2.2H6.2C5 22 4 21 4 19.8V4.2C4 3 5 2 6.2 2z" />
      <path d="M8 11.5h8M8 15h8M8 18.4h5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function GraduationSolid({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M11.4 3.2a1.4 1.4 0 0 1 1.2 0l9.7 4.6c.9.4.9 1.7 0 2.1l-9.7 4.6a1.4 1.4 0 0 1-1.2 0L1.7 9.9c-.9-.4-.9-1.7 0-2.1l9.7-4.6z" />
      <path d="M5.5 12.6v3.6c0 1.8 2.9 3.6 6.5 3.6s6.5-1.8 6.5-3.6v-3.6l-5.4 2.6a2.6 2.6 0 0 1-2.2 0l-5.4-2.6z" />
      <path d="M21.3 9.6h1.4v5.6a.7.7 0 0 1-1.4 0V9.6z" />
    </svg>
  );
}

export function BarsSolid({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <rect x="3" y="13" width="4.6" height="8" rx="1.3" />
      <rect x="9.7" y="8" width="4.6" height="13" rx="1.3" />
      <rect x="16.4" y="3" width="4.6" height="18" rx="1.3" />
    </svg>
  );
}

/** Casa preenchida — item "Início" ativo na barra inferior (referência mobile). */
export function HouseSolid({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M10.6 2.6a2.2 2.2 0 0 1 2.8 0l7.3 6.1c.5.4.8 1 .8 1.7v9.4c0 1.2-1 2.2-2.2 2.2h-4.1v-6.2c0-.6-.4-1-1-1H9.8c-.6 0-1 .4-1 1V22H4.7c-1.2 0-2.2-1-2.2-2.2v-9.4c0-.7.3-1.3.8-1.7l7.3-6.1z" />
    </svg>
  );
}
