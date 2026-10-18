import { forbidden } from "../errors";
import type { Permission, RoleKey } from "./permissions";

/** Identidade autenticada usada por toda a camada de serviços (nunca vem do cliente). */
export type Actor = {
  userId: string;
  sessionId: string;
  email: string;
  roles: RoleKey[];
  permissions: ReadonlySet<Permission>;
  mustChangePassword: boolean;
  employee: {
    id: string;
    fullName: string;
    preferredName: string | null;
    registrationNumber: string;
    departmentId: string;
    unitId: string;
    jobPositionId: string;
    jobFamilyId: string;
  } | null;
};

/** Contexto de requisição para auditoria (IP já pseudonimizado). */
export type RequestMeta = {
  requestId: string;
  ipHash: string | null;
  userAgent: string | null;
};

export type Ctx = { actor: Actor; meta: RequestMeta };

export function can(actor: Actor, permission: Permission): boolean {
  return actor.permissions.has(permission);
}

export function requirePermission(actor: Actor, permission: Permission): void {
  if (!can(actor, permission)) throw forbidden();
}

/** Ações do colaborador exigem vínculo de colaborador (employee). */
export function requireEmployee(actor: Actor) {
  if (!actor.employee) throw forbidden();
  return actor.employee;
}

export function displayName(actor: Actor): string {
  if (!actor.employee) return actor.email;
  return actor.employee.preferredName ?? actor.employee.fullName.split(" ")[0];
}
