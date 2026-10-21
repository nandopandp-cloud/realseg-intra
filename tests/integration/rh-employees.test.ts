import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { POST as createPost } from "@/app/api/v1/rh/employees/route";
import { getDb } from "@/server/db/client";
import { departments, employees, jobPositions, mailOutbox, units, users } from "@/server/db/schema";
import { login } from "@/server/services/auth";
import { validateSessionToken } from "@/server/auth/session";
import * as emp from "@/server/services/rh/employees";
import * as org from "@/server/services/rh/org";
import { apiRequest, ctxFor, params, resetDatabase, sessionCookie, testMeta, type People } from "../support/db";
import type { Ctx } from "@/server/auth/actor";

let people: People;
let mariana: Ctx; // RH
let lucas: Ctx; // ADMIN (sem permissões de RH)
let carlos: Ctx;
let refs: { departmentId: string; unitId: string; jobPositionId: string };

beforeEach(async () => {
  people = await resetDatabase();
  mariana = await ctxFor(people.mariana.user);
  lucas = await ctxFor(people.lucas.user);
  carlos = await ctxFor(people.carlos.user);
  const db = getDb();
  const [d] = await db.select().from(departments).where(eq(departments.code, "OPS"));
  const [u] = await db.select().from(units).where(eq(units.name, "Sede Administrativa"));
  const [p] = await db.select().from(jobPositions).where(eq(jobPositions.title, "Auxiliar Operacional"));
  refs = { departmentId: d.id, unitId: u.id, jobPositionId: p.id };
});

const input = (patch: Partial<emp.EmployeeInput> = {}): emp.EmployeeInput => ({
  fullName: "Beatriz Nogueira",
  registrationNumber: "100777",
  email: "beatriz.nogueira@demo.realseg.invalid",
  admissionDate: "2026-10-01",
  ...refs,
  ...patch,
});

describe("cadastro e primeiro acesso", () => {
  it("senha temporária: entra com matrícula e precisa trocar a senha", async () => {
    const r = await emp.createEmployee(mariana, { ...input(), access: "temp" });
    expect(r.temporaryPassword).toMatch(/^[A-Z][a-z]{3}-\d{2}[a-z]{2}-\d{3}$/);
    const s = await login({ identifier: "100777", password: r.temporaryPassword! }, testMeta);
    const v = await validateSessionToken(s.token);
    expect(v.status).toBe("valid");
    if (v.status === "valid") {
      expect(v.actor.mustChangePassword).toBe(true);
      expect(v.actor.roles).toEqual(["COLABORADOR"]);
    }
    const e = await emp.getEmployee(mariana, r.id);
    expect(e.roles).toEqual(["COLABORADOR"]);
  });

  it("convite por e-mail com link válido por 72 horas", async () => {
    const r = await emp.createEmployee(mariana, { ...input(), access: "invite" });
    expect(r.temporaryPassword).toBeNull();
    const [mail] = await getDb().select().from(mailOutbox).where(eq(mailOutbox.to, "beatriz.nogueira@demo.realseg.invalid"));
    expect(mail.subject).toBe("Seu acesso à Intranet REALSEG");
    expect(mail.text).toMatch(/redefinir-senha\?token=/);
    expect(mail.text).toContain("72 horas");
  });

  it("matrícula e e-mail únicos com erro no campo; referências validadas", async () => {
    await expect(emp.createEmployee(mariana, { ...input({ registrationNumber: "100231" }), access: "temp" })).rejects.toMatchObject({ code: "VALIDATION_ERROR", details: { registrationNumber: expect.any(Array) } });
    await expect(emp.createEmployee(mariana, { ...input({ email: "CARLOS.SILVA@demo.realseg.invalid" }), access: "temp" })).rejects.toMatchObject({ details: { email: expect.any(Array) } });
    await expect(emp.createEmployee(mariana, { ...input({ unitId: "00000000-0000-4000-8000-000000000000" }), access: "temp" })).rejects.toMatchObject({ details: { unitId: expect.any(Array) } });
    const res = await createPost(apiRequest("/api/v1/rh/employees", { method: "POST", json: { ...input({ registrationNumber: "12a" }), access: "temp" }, cookie: await sessionCookie(people.mariana.user.id) }), params({}));
    expect(res.status).toBe(422);
  });

  it("RH não concede papéis; administrador sem permissão de RH não cadastra", async () => {
    await expect(emp.createEmployee(mariana, { ...input(), access: "temp", roles: ["RH"] })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(emp.createEmployee(lucas, { ...input(), access: "temp" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(emp.createEmployee(carlos, { ...input(), access: "temp" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("papéis", () => {
  it("administrador concede e remove papéis; não remove o próprio Administrador", async () => {
    await emp.setEmployeeRoles(lucas, people.carlos.employee.id, ["GESTOR"]);
    expect((await emp.getEmployee(mariana, people.carlos.employee.id)).roles).toEqual(["COLABORADOR", "GESTOR"]);
    await emp.setEmployeeRoles(lucas, people.carlos.employee.id, []);
    expect((await emp.getEmployee(mariana, people.carlos.employee.id)).roles).toEqual(["COLABORADOR"]);
    await expect(emp.setEmployeeRoles(lucas, people.lucas.employee.id, [])).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(emp.setEmployeeRoles(mariana, people.carlos.employee.id, ["ADMIN"])).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("situação e acesso", () => {
  it("desligar bloqueia o acesso na hora (sessões revogadas); reativar devolve", async () => {
    const s = await login({ identifier: "100231", password: "Realseg@2026" }, testMeta);
    await emp.setEmployeeStatus(mariana, people.carlos.employee.id, "desligado");
    expect((await validateSessionToken(s.token)).status).toBe("invalid");
    await expect(login({ identifier: "100231", password: "Realseg@2026" }, testMeta)).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    await expect(emp.setEmployeeStatus(mariana, people.mariana.employee.id, "desligado")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await emp.setEmployeeStatus(mariana, people.carlos.employee.id, "ativo");
    expect((await login({ identifier: "100231", password: "Realseg@2026" }, testMeta)).token).toBeTruthy();
  });

  it("nova senha temporária desbloqueia a conta e encerra sessões", async () => {
    await getDb().update(users).set({ lockedUntil: new Date(Date.now() + 3600_000), failedLoginCount: 5 }).where(eq(users.id, people.carlos.user.id));
    expect((await emp.getEmployee(mariana, people.carlos.employee.id)).locked).toBe(true);
    const { temporaryPassword } = await emp.resetEmployeeAccess(mariana, people.carlos.employee.id, "temp");
    expect((await emp.getEmployee(mariana, people.carlos.employee.id)).locked).toBe(false);
    expect((await login({ identifier: "100231", password: temporaryPassword! }, testMeta)).token).toBeTruthy();
  });

  it("lista filtra por situação, papel e busca", async () => {
    await emp.setEmployeeStatus(mariana, people.joao.employee.id, "afastado");
    const afastados = await emp.listEmployees(mariana, { status: "afastado" });
    expect(afastados.items.map((i) => i.name)).toEqual(["João Pereira"]);
    expect((await emp.listEmployees(mariana, { role: "RH" })).items.map((i) => i.name)).toEqual(["Mariana Costa"]);
    expect((await emp.listEmployees(mariana, { q: "100198" })).items.map((i) => i.name)).toEqual(["Ana Souza"]);
    expect((await emp.listEmployees(mariana, { q: "souza" })).items.map((i) => i.name)).toEqual(["Ana Souza"]);
  });
});

describe("importação por planilha", () => {
  const csv = [
    "matricula;nome;email;area;unidade;cargo;admissao;gestor_matricula",
    "100801;Paula Rocha;paula.rocha@demo.realseg.invalid;OPS;Sede Administrativa;Auxiliar Operacional;01/11/2026;100045",
    "100231;Duplicado;dup@demo.realseg.invalid;OPS;Sede Administrativa;Auxiliar Operacional;01/11/2026;",
    "100802;Sem Área;sem.area@demo.realseg.invalid;XYZ;Sede Administrativa;Auxiliar Operacional;31/02/2026;",
    '100803;"Marcos; com ponto e vírgula";marcos@demo.realseg.invalid;Operações;sede administrativa;auxiliar operacional;2026-11-02;',
  ].join("\r\n");

  it("prévia valida linha a linha sem gravar; importação grava só as válidas e envia convites", async () => {
    const dry = await emp.importEmployees(mariana, csv, { dryRun: true });
    expect(dry).toMatchObject({ total: 4, valid: 2, created: 0 });
    expect(dry.rows[1].message).toContain("matrícula já cadastrada");
    expect(dry.rows[2].message).toContain('área "XYZ" não encontrada');
    expect((await getDb().select().from(employees).where(eq(employees.registrationNumber, "100801"))).length).toBe(0);
    const real = await emp.importEmployees(mariana, csv, { dryRun: false });
    expect(real.created).toBe(2);
    const [paula] = await getDb().select().from(employees).where(eq(employees.registrationNumber, "100801"));
    expect(paula.managerEmployeeId).toBe(people.roberto.employee.id);
    const [marcos] = await getDb().select().from(employees).where(eq(employees.registrationNumber, "100803"));
    expect(marcos.fullName).toBe("Marcos; com ponto e vírgula");
    expect((await getDb().select().from(mailOutbox)).filter((m) => m.subject === "Seu acesso à Intranet REALSEG")).toHaveLength(2);
  });

  it("cabeçalho incompleto é recusado", async () => {
    await expect(emp.importEmployees(mariana, "matricula;nome\n1;x", { dryRun: true })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("estrutura", () => {
  it("não desativa área/unidade/cargo com colaboradores ativos; código de área é único", async () => {
    await expect(org.saveDepartment(mariana, refs.departmentId, { code: "OPS", name: "Operações", active: false })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(org.saveUnit(mariana, refs.unitId, { name: "Sede Administrativa", city: "São Paulo", state: "SP", active: false })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(org.saveDepartment(mariana, null, { code: "ops", name: "Duplicada", active: true })).rejects.toMatchObject({ details: { code: expect.any(Array) } });
    const nova = await org.saveDepartment(mariana, null, { code: "jur", name: "Jurídico", active: true });
    await org.saveDepartment(mariana, nova.id, { code: "JUR", name: "Jurídico", active: false });
    const s = await org.structureOverview(mariana);
    expect(s.departments.find((d) => d.id === nova.id)).toMatchObject({ code: "JUR", active: false, people: 0 });
    expect(s.departments.find((d) => d.id === refs.departmentId)!.people).toBeGreaterThan(0);
    expect((await org.orgOptions(mariana)).departments.some((d) => d.id === nova.id)).toBe(false);
  });

  it("cargos por família e exclusão de família só sem cargos", async () => {
    const fam = await org.saveFamily(mariana, null, { name: "Jurídico" });
    const pos = await org.savePosition(mariana, null, { title: "Advogado", familyId: fam.id, level: 1, levelLabel: "Júnior", active: true });
    await expect(org.deleteFamily(mariana, fam.id)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect((await org.structureOverview(mariana)).positions.find((p) => p.id === pos.id)).toMatchObject({ familyName: "Jurídico", people: 0 });
    await expect(org.saveFamily(carlos, null, { name: "X" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
