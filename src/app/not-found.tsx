import Link from "@/components/ui/app-link";

export default function RootNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="eyebrow">Erro 404</p>
      <h1 className="text-3xl font-bold text-ink">Página não encontrada</h1>
      <p className="text-muted">O endereço não existe ou você não tem acesso a ele.</p>
      <Link href="/" className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-brand-700 px-5 font-semibold text-white">
        Ir para o início
      </Link>
    </main>
  );
}
