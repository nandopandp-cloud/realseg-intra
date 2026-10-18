import Image from "next/image";
import { BrandLogo } from "@/components/ui/brand-logo";
import { DemoBanner } from "@/components/ui/primitives";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  const demo = process.env.APP_ENV !== "production";
  return (
    <div className="flex min-h-dvh flex-col">
      {demo && <DemoBanner />}
      <div className="flex flex-1">
        <aside className="relative hidden w-[44%] max-w-[640px] flex-col justify-between overflow-hidden bg-navy-950 p-12 lg:flex">
          <BrandLogo variant="dark" size="lg" className="relative z-10" />
          <div className="relative z-10 max-w-sm">
            <p className="font-mono text-xs tracking-[0.3em] text-brand-400 uppercase">Área do colaborador</p>
            <p className="mt-4 text-4xl leading-tight font-bold text-white">Tudo o que você precisa para o seu dia a dia, em um só lugar.</p>
            <span className="mt-6 block h-1 w-12 rounded-full bg-brand-400" aria-hidden />
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[62%]" aria-hidden>
            <Image src="/images/mhero-ajuda.jpg" alt="" fill sizes="400px" className="object-cover object-center opacity-70" />
            <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/40 to-transparent" />
          </div>
          <p className="relative z-10 text-sm text-on-dark-muted">Ambiente restrito a colaboradores REALSEG.</p>
        </aside>
        <main id="conteudo" className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-10 flex justify-center lg:hidden">
              <BrandLogo variant="light" size="md" />
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
