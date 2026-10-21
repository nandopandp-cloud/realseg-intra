import type { Metadata } from "next";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/primitives";
import { InstitutionalForm } from "@/features/rh/documents/document-forms";
import { requireRhCtx } from "@/server/auth/rh";
import { documentCategoryOptions } from "@/server/services/rh/documents";

export const metadata: Metadata = { title: "Nova norma · Gestão" };

export default async function NewPolicyPage() {
  await requireRhCtx("document:manage");
  const categories = await documentCategoryOptions("institutional");
  return (
    <AdminPage>
      <AdminPageHeader title="Nova norma ou manual" crumbs={[{ label: "Documentos", href: "/rh/documentos?aba=normas" }]} description="Fica disponível para todos os colaboradores em Documentos › Normas e manuais." />
      <Card className="max-w-3xl p-5 sm:p-6">
        <InstitutionalForm categories={categories} />
      </Card>
    </AdminPage>
  );
}
