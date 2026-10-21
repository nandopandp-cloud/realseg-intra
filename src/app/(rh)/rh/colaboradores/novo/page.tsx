import type { Metadata } from "next";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { EMPTY_EMPLOYEE, EmployeeForm } from "@/features/rh/employees/employee-form";
import { can } from "@/server/auth/actor";
import { requireRhCtx } from "@/server/auth/rh";
import { orgOptions } from "@/server/services/rh/org";

export const metadata: Metadata = { title: "Cadastrar colaborador · Gestão" };

export default async function NewEmployeePage() {
  const ctx = await requireRhCtx("employee:manage");
  const org = await orgOptions(ctx);
  return (
    <AdminPage>
      <AdminPageHeader title="Cadastrar colaborador" crumbs={[{ label: "Colaboradores", href: "/rh/colaboradores" }]} description="Cria o cadastro e a conta de acesso à intranet." />
      <EmployeeForm initial={EMPTY_EMPLOYEE} org={org} canManageRoles={can(ctx.actor, "role:manage")} />
    </AdminPage>
  );
}
