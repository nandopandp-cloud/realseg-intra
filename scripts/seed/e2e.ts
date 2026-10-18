/** Dados determinísticos para E2E: demonstração + usuários para cenários de borda. */
import type { Database } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { hashPassword } from "@/server/auth/crypto";
import { DEMO_DOMAIN, DEMO_PASSWORD, seedDemo } from "./demo";

export async function seedE2E(db: Database) {
  const people = await seedDemo(db);
  const roles = await db.select().from(s.roles);
  const colab = roles.find((r) => r.key === "COLABORADOR")!;
  const hash = await hashPassword(DEMO_PASSWORD);
  // Conta para testes de bloqueio (não reutilizada em outros testes).
  const extra = [
    { email: `bloqueio@${DEMO_DOMAIN}`, registration: "900001", name: "Usuário Bloqueio" },
    { email: `reset@${DEMO_DOMAIN}`, registration: "900002", name: "Usuário Recuperação" },
    { email: `inativo@${DEMO_DOMAIN}`, registration: "900003", name: "Usuário Inativo", inactive: true },
  ];
  const carlosEmp = people.carlos.employee;
  for (const p of extra) {
    const [u] = await db.insert(s.users).values({ email: p.email, passwordHash: hash, status: p.inactive ? "inactive" : "active" }).returning();
    await db.insert(s.employees).values({
      userId: u.id,
      fullName: p.name,
      registrationNumber: p.registration,
      departmentId: carlosEmp.departmentId,
      unitId: carlosEmp.unitId,
      jobPositionId: carlosEmp.jobPositionId,
      admissionDate: "2024-01-01",
    });
    await db.insert(s.userRoles).values({ userId: u.id, roleId: colab.id });
  }
}
