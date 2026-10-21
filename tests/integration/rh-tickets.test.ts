import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { POST as messagesPost } from "@/app/api/v1/rh/tickets/[number]/messages/route";
import { POST as assignPost } from "@/app/api/v1/rh/tickets/[number]/assign/route";
import { GET as attachmentGet } from "@/app/api/v1/rh/tickets/[number]/attachments/[id]/route";
import { getDb } from "@/server/db/client";
import { auditEvents, notifications, ticketEvents, tickets } from "@/server/db/schema";
import * as tk from "@/server/services/tickets";
import * as q from "@/server/services/rh/tickets";
import { rhDashboard } from "@/server/services/rh/dashboard";
import { makeDemoPdf } from "../../scripts/seed/pdf";
import { apiRequest, ctxFor, params, resetDatabase, sessionCookie, type People } from "../support/db";
import type { Ctx } from "@/server/auth/actor";

let people: People;
let carlos: Ctx;
let mariana: Ctx;

beforeEach(async () => {
  people = await resetDatabase();
  carlos = await ctxFor(people.carlos.user);
  mariana = await ctxFor(people.mariana.user);
});

const newTicket = () => tk.createTicket(carlos, { categorySlug: "rh", subject: "Dúvida sobre benefício", description: "Gostaria de entender o vale-alimentação." });

describe("fila de atendimento", () => {
  it("exige permissão de atendimento (colaborador não acessa)", async () => {
    await expect(q.listQueue(carlos)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(q.getTicketForAgent(carlos, 1048)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(tk.agentReply(carlos, 1048, { body: "x" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const d = await rhDashboard(carlos);
    expect(d).toEqual({ tickets: null, submissions: null, people: null, content: null, learning: null, career: null });
  });

  it("abas e contadores refletem a situação e o responsável", async () => {
    const t = await newTicket();
    const before = await q.listQueue(mariana, { tab: "sem-responsavel" });
    expect(before.items.some((i) => i.number === t.number)).toBe(true);
    await tk.agentAssign(mariana, t.number, people.mariana.user.id);
    const mine = await q.listQueue(mariana, { tab: "minhas" });
    expect(mine.items.find((i) => i.number === t.number)?.assigneeName).toBe("Mariana Costa");
    expect((await q.listQueue(mariana, { tab: "sem-responsavel" })).items.some((i) => i.number === t.number)).toBe(false);
    expect(mine.counts.minhas).toBe(mine.total);
    // Busca por protocolo, nome e matrícula.
    expect((await q.listQueue(mariana, { q: String(t.number) })).items.map((i) => i.number)).toEqual([t.number]);
    expect((await q.listQueue(mariana, { q: "100231" })).items.every((i) => i.requester.registration === "100231")).toBe(true);
  });

  it("atrasadas: prazo vencido e relógio correndo", async () => {
    const t = await newTicket();
    await getDb().update(tickets).set({ resolutionDueAt: new Date(Date.now() - 3600_000) }).where(eq(tickets.number, t.number));
    const late = await q.listQueue(mariana, { tab: "atrasadas" });
    expect(late.items.some((i) => i.number === t.number)).toBe(true);
    expect((await rhDashboard(mariana)).tickets!.atrasadas).toBeGreaterThanOrEqual(1);
  });
});

describe("atendimento", () => {
  it("nota interna é vista pela equipe e nunca pelo colaborador", async () => {
    const t = await newTicket();
    await tk.agentReply(mariana, t.number, { body: "Verificar com o financeiro", internal: true });
    await tk.agentReply(mariana, t.number, { body: "Olá! Estamos verificando.", setStatus: "em_andamento" });
    const agentView = await q.getTicketForAgent(mariana, t.number);
    expect(agentView.messages.map((m) => [m.body, m.isInternal])).toEqual([
      ["Verificar com o financeiro", true],
      ["Olá! Estamos verificando.", false],
    ]);
    expect(agentView.status).toBe("em_andamento");
    expect(agentView.firstRespondedAt).not.toBeNull();
    const mine = await tk.getMyTicket(carlos, t.number);
    expect(mine.messages.map((m) => m.body)).toEqual(["Olá! Estamos verificando."]);
    // Só a resposta pública notifica o colaborador.
    const notes = await getDb().select().from(notifications).where(eq(notifications.userId, people.carlos.user.id));
    expect(notes.filter((n) => n.entityId === t.id)).toHaveLength(1);
  });

  it("resposta com anexo: anexo baixado pelo atendimento é auditado", async () => {
    const t = await newTicket();
    const fd = new FormData();
    fd.set("body", "Segue o informativo.");
    fd.set("internal", "false");
    fd.append("files", new File([makeDemoPdf("Informativo", []) as BlobPart], "informativo.pdf", { type: "application/pdf" }));
    const cookie = await sessionCookie(people.mariana.user.id);
    const res = await messagesPost(apiRequest(`/api/v1/rh/tickets/${t.number}/messages`, { method: "POST", body: fd, cookie }), params({ number: String(t.number) }));
    expect(res.status).toBe(201);
    const view = await q.getTicketForAgent(mariana, t.number);
    expect(view.attachments).toHaveLength(1);
    const dl = await attachmentGet(apiRequest(`/api/v1/rh/tickets/${t.number}/attachments/${view.attachments[0].id}`, { cookie }), params({ number: String(t.number), id: view.attachments[0].id }));
    expect(dl.status).toBe(200);
    const audits = await getDb().select().from(auditEvents).where(eq(auditEvents.action, "ticket.attachment_downloaded"));
    expect(audits.some((a) => a.entityId === t.id && a.actorUserId === people.mariana.user.id)).toBe(true);
    // O colaborador também vê o anexo da resposta pública.
    expect((await tk.getMyTicket(carlos, t.number)).attachments).toHaveLength(1);
  });

  it("validações de resposta: mensagem vazia e transição inválida", async () => {
    const t = await newTicket();
    const cookie = await sessionCookie(people.mariana.user.id);
    const fd = new FormData();
    fd.set("body", "   ");
    const res = await messagesPost(apiRequest(`/api/v1/rh/tickets/${t.number}/messages`, { method: "POST", body: fd, cookie }), params({ number: String(t.number) }));
    expect(res.status).toBe(422);
    await expect(tk.agentReply(mariana, t.number, { body: "ok", setStatus: "fechado" })).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  });

  it("encerrada não aceita novas mensagens", async () => {
    const t = await newTicket();
    await tk.agentChangeStatus(mariana, t.number, "cancelado", "Duplicada");
    await expect(tk.agentReply(mariana, t.number, { body: "oi" })).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    expect((await q.getTicketForAgent(mariana, t.number)).transitions).toEqual([]);
  });

  it("atribuição: só para a equipe de atendimento; notifica e registra no histórico; aceita remover", async () => {
    const t = await newTicket();
    await expect(tk.agentAssign(mariana, t.number, people.carlos.user.id)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const cookie = await sessionCookie(people.mariana.user.id);
    const res = await assignPost(apiRequest(`/api/v1/rh/tickets/${t.number}/assign`, { method: "POST", json: { assigneeUserId: people.mariana.user.id }, cookie }), params({ number: String(t.number) }));
    expect(res.status).toBe(204);
    await tk.agentAssign(mariana, t.number, null);
    const view = await q.getTicketForAgent(mariana, t.number);
    expect(view.assigneeUserId).toBeNull();
    const evs = await getDb().select().from(ticketEvents).where(eq(ticketEvents.ticketId, t.id));
    expect(evs.filter((e) => e.type === "assigned")).toHaveLength(2);
    expect(view.events.find((e) => e.type === "assigned")?.toLabel).toBe("Sem responsável");
  });

  it("equipe de atendimento lista apenas quem pode atender", async () => {
    const agents = await q.listAgents(mariana);
    expect(agents.map((a) => a.name)).toEqual(["Mariana Costa"]);
  });
});
