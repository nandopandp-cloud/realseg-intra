import type { Metadata } from "next";
import { z } from "zod";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { LinkTabs } from "@/components/ui/navigation";
import { Card } from "@/components/ui/primitives";
import { DistributeBatch, DistributeOne } from "@/features/rh/documents/distribute";
import { requireRhCtx } from "@/server/auth/rh";
import { documentCategoryOptions } from "@/server/services/rh/documents";

export const metadata: Metadata = { title: "Distribuir documento · Gestão" };

const params = z.object({ modo: z.enum(["individual", "lote"]).catch("individual") });

export default async function DistributePage({ searchParams }: PageProps<"/rh/documentos/distribuir">) {
  await requireRhCtx("document:manage");
  const { modo } = params.parse(await searchParams);
  const categories = await documentCategoryOptions("personal");
  return (
    <AdminPage>
      <AdminPageHeader
        title="Distribuir documento"
        crumbs={[{ label: "Documentos", href: "/rh/documentos?aba=pessoais" }]}
        description="O documento fica disponível só para o colaborador destinatário, em “Meus documentos”, e cada acesso é registrado."
      />
      <LinkTabs
        label="Modo de envio"
        className="mb-5"
        items={[
          { href: "/rh/documentos/distribuir", label: "Para um colaborador", active: modo === "individual" },
          { href: "/rh/documentos/distribuir?modo=lote", label: "Em lote (ex.: holerites do mês)", active: modo === "lote" },
        ]}
      />
      <Card className="max-w-3xl p-5 sm:p-6">{modo === "lote" ? <DistributeBatch categories={categories} /> : <DistributeOne categories={categories} />}</Card>
    </AdminPage>
  );
}
