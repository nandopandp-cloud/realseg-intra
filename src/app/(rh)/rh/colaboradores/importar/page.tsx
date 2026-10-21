import type { Metadata } from "next";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/primitives";
import { ImportEmployees } from "@/features/rh/employees/import-employees";
import { requireRhCtx } from "@/server/auth/rh";

export const metadata: Metadata = { title: "Importar colaboradores · Gestão" };

export default async function ImportEmployeesPage() {
  await requireRhCtx("employee:manage");
  return (
    <AdminPage>
      <AdminPageHeader title="Importar colaboradores" crumbs={[{ label: "Colaboradores", href: "/rh/colaboradores" }]} description="Carga inicial ou admissões em grupo a partir de uma planilha. Nada é gravado antes da sua confirmação." />
      <Card className="max-w-4xl p-5 sm:p-6">
        <ImportEmployees />
      </Card>
    </AdminPage>
  );
}
