"use client";

import { RotateCcw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { TriangleAlert } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="px-4 pt-10 sm:px-6 lg:px-10">
      <EmptyState
        icon={TriangleAlert}
        title="Algo deu errado ao carregar esta página"
        description={
          <>
            Tente novamente em instantes. Se o problema continuar, abra uma solicitação para a TI{error.digest ? ` informando o código ${error.digest}` : ""}.
          </>
        }
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={reset} icon={<RotateCcw className="size-5" aria-hidden />}>
              Tentar novamente
            </Button>
            <ButtonLink href="/rh" variant="outline">
              Voltar ao painel
            </ButtonLink>
          </div>
        }
      />
    </div>
  );
}
