import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/server/db/client";
import { jobPositions, notifications, opportunityApplications, units } from "@/server/db/schema";
import * as career from "@/server/services/career";
import * as fb from "@/server/services/feedbacks";
import * as rhc from "@/server/services/rh/career";
import * as rhf from "@/server/services/rh/feedbacks";
import type { AudienceInput } from "@/server/services/rh/audience";
import { ctxFor, resetDatabase, type People } from "../support/db";
import type { Ctx } from "@/server/auth/actor";

let people: People;
let carlos: Ctx;
let ana: Ctx;
let mariana: Ctx;

beforeEach(async () => {
  people = await resetDatabase();
  carlos = await ctxFor(people.carlos.user);
  ana = await ctxFor(people.ana.user);
  mariana = await ctxFor(people.mariana.user);
});

const ALL: AudienceInput = { all: true, department: [], unit: [], job_position: [], job_family: [] };
const opp = (patch: Partial<rhc.OpportunityInput> = {}): rhc.OpportunityInput => ({
  title: "Supervisor de Operações",
  areaLabel: "Operações",
  description: "Coordenar equipes operacionais.",
  requirements: "Experiência com equipes.",
  jobPositionId: null,
  departmentId: null,
  unitId: null,
  isHighlighted: true,
  closesAt: new Date(Date.now() + 10 * 86400_000).toISOString(),
  eligibility: ALL,
  ...patch,
});

describe("oportunidades internas", () => {
  it("rascunho é invisível; publicada aparece aos elegíveis e avisa; encerrar fecha candidaturas", async () => {
    const [rj] = await getDb().select().from(units).where(eq(units.name, "Unidade Rio de Janeiro"));
    const { id } = await rhc.saveOpportunity(mariana, null, opp({ eligibility: { ...ALL, all: false, unit: [rj.id] } }));
    await expect(career.getOpportunity(ana, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await rhc.setOpportunityStatus(mariana, id, "published", { notify: true });
    expect((await career.getOpportunity(ana, id)).title).toBe("Supervisor de Operações");
    await expect(career.getOpportunity(carlos, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await getDb().select().from(notifications).where(eq(notifications.entityId, id))).map((n) => n.userId)).toEqual([people.ana.user.id]);
    await career.applyToOpportunity(ana, id, "Tenho interesse.");
    const detail = await rhc.getOpportunityAdmin(mariana, id);
    expect(detail.applications.map((a) => [a.employee.name, a.status, a.message])).toEqual([["Ana Souza", "enviada", "Tenho interesse."]]);
    await rhc.setApplicationStatus(mariana, detail.applications[0].id, "em_analise");
    expect((await career.myApplications(ana))[0].status).toBe("em_analise");
    await rhc.setOpportunityStatus(mariana, id, "closed");
    const [app] = await getDb().select().from(opportunityApplications).where(eq(opportunityApplications.opportunityId, id));
    expect(app.status).toBe("encerrada");
    expect((await rhc.listOpportunitiesAdmin(mariana, { tab: "encerradas" })).items.some((o) => o.id === id)).toBe(true);
  });

  it("sem regras de elegibilidade = todos; prazo vencido impede publicar; retirada não muda", async () => {
    const { id } = await rhc.saveOpportunity(mariana, null, opp());
    expect((await rhc.getOpportunityAdmin(mariana, id)).eligibilityLabels).toEqual(["Todos os colaboradores"]);
    await rhc.setOpportunityStatus(mariana, id, "published");
    await career.applyToOpportunity(carlos, id);
    await career.withdrawApplication(carlos, id);
    const a = (await rhc.getOpportunityAdmin(mariana, id)).applications[0];
    await expect(rhc.setApplicationStatus(mariana, a.id, "em_analise")).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    const late = await rhc.saveOpportunity(mariana, null, opp({ closesAt: new Date(Date.now() - 1000).toISOString() }));
    await expect(rhc.setOpportunityStatus(mariana, late.id, "published")).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    await expect(rhc.saveOpportunity(carlos, null, opp())).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("faixas salariais", () => {
  it("só faixas publicadas e vigentes aparecem no plano de cargos do colaborador", async () => {
    const [pos] = await getDb().select().from(jobPositions).where(eq(jobPositions.title, "Auxiliar Operacional"));
    const before = (await career.careerPlan(carlos)).positions.find((p) => p.id === pos.id)!.band;
    const hidden = await rhc.saveBand(mariana, null, { jobPositionId: pos.id, minCents: 300000, maxCents: 350000, effectiveFrom: "2026-01-01", effectiveUntil: null, visibleToEmployees: false });
    expect((await career.careerPlan(carlos)).positions.find((p) => p.id === pos.id)!.band).toEqual(before);
    await rhc.saveBand(mariana, hidden.id, { jobPositionId: pos.id, minCents: 300000, maxCents: 350000, effectiveFrom: "2026-10-01", effectiveUntil: null, visibleToEmployees: true });
    expect((await career.careerPlan(carlos)).positions.find((p) => p.id === pos.id)!.band).toMatchObject({ minCents: 300000, maxCents: 350000 });
    await expect(rhc.saveBand(mariana, null, { jobPositionId: pos.id, minCents: 5, maxCents: 1, effectiveFrom: "2026-01-01", effectiveUntil: null, visibleToEmployees: true })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const list = await rhc.listBandsAdmin(mariana);
    expect(list.find((p) => p.id === pos.id)!.current?.minCents).toBe(300000);
    await expect(rhc.listBandsAdmin(carlos)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("plano de desenvolvimento", () => {
  it("meta criada pelo RH aparece em Minha carreira e avisa o colaborador", async () => {
    const g = await rhc.saveGoal(mariana, people.joao.employee.id, null, { title: "Concluir integração", description: null, startsOn: null, dueDate: "2026-12-01", courseId: null, status: "pendente" });
    const joao = await ctxFor(people.joao.user);
    expect((await career.myGoals(joao)).map((x) => x.title)).toContain("Concluir integração");
    await rhc.saveGoal(mariana, people.joao.employee.id, g.id, { title: "Concluir integração", description: null, startsOn: null, dueDate: "2026-12-01", courseId: null, status: "concluida" });
    expect((await career.myGoals(joao)).find((x) => x.id === g.id)?.status).toBe("concluida");
    await expect(rhc.deleteGoal(mariana, people.carlos.employee.id, g.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await rhc.deleteGoal(mariana, people.joao.employee.id, g.id);
    expect((await notifications$(people.joao.user.id)).some((n) => n.title === "Nova etapa no seu plano de desenvolvimento")).toBe(true);
  });
});

const notifications$ = (userId: string) => getDb().select().from(notifications).where(eq(notifications.userId, userId));

describe("feedbacks", () => {
  const input = (patch: Partial<rhf.FeedbackInput> = {}): rhf.FeedbackInput => ({
    employeeId: people.carlos.employee.id,
    type: "reconhecimento",
    title: "Excelente atendimento",
    cycle: "Ciclo 2026.2",
    body: "Parabéns pela postura no evento.",
    authorContext: "Recursos Humanos",
    showAuthor: false,
    ...patch,
  });

  it("rascunho não aparece; publicado aparece sem expor o conteúdo na notificação; edição reinicia a confirmação", async () => {
    const { id } = await rhf.createFeedback(mariana, { ...input(), publish: false });
    expect((await fb.listMyFeedbacks(carlos)).some((f) => f.id === id)).toBe(false);
    await rhf.publishFeedback(mariana, id);
    const mine = await fb.getMyFeedback(carlos, id);
    expect(mine.authorLabel).toBe("Recursos Humanos");
    const [n] = (await notifications$(people.carlos.user.id)).filter((x) => x.entityId === id);
    expect(n.title).not.toContain("Excelente");
    await fb.acknowledgeFeedback(carlos, id);
    await rhf.updateFeedback(mariana, id, input({ body: "Texto revisado." }));
    expect((await fb.getMyFeedback(carlos, id)).acknowledgedAt).toBeNull();
    await expect(rhf.updateFeedback(mariana, id, input({ employeeId: people.ana.employee.id }))).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  });

  it("arquivar oculta; rascunho é excluído; ninguém registra feedback para si", async () => {
    const { id } = await rhf.createFeedback(mariana, { ...input(), publish: true });
    await rhf.archiveFeedback(mariana, id);
    await expect(fb.getMyFeedback(carlos, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const d = await rhf.createFeedback(mariana, { ...input(), publish: false });
    expect(await rhf.archiveFeedback(mariana, d.id)).toEqual({ deleted: true });
    await expect(rhf.createFeedback(mariana, { ...input({ employeeId: people.mariana.employee.id }), publish: true })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(rhf.createFeedback(ana, { ...input(), publish: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const list = await rhf.listFeedbacksAdmin(mariana, { tab: "arquivados" });
    expect(list.items.map((i) => i.id)).toContain(id);
  });
});
