import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { IconTile } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center px-4 pt-14 text-center sm:px-6 lg:px-10">
      <IconTile icon={SearchX} tone="teal" size="lg" />
      <h1 className="mt-4 text-2xl font-bold text-ink">Página não encontrada</h1>
      <p className="mt-1 max-w-md text-[0.9375rem] text-muted">O conteúdo não existe ou você não tem permissão para acessá-lo.</p>
      <ButtonLink href="/rh" className="mt-5">
        Voltar ao painel
      </ButtonLink>
    </div>
  );
}
