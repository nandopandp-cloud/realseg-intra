import { and, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { GET as ticketGet } from "@/app/api/v1/tickets/[number]/route";
import { POST as ticketsPost } from "@/app/api/v1/tickets/route";
import { getDb } from "@/server/db/client";
import { notifications, slaPolicies, ticketCategories, ticketEvents, ticketParticipants, tickets, users } from "@/server/db/schema";
import * as tk from "@/server/services/tickets";
import { validateSessionToken } from "@/server/auth/session";
import { businessMinutesBetween } from "@/server/sla/business-time";
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

const newTicket = (ctx: Ctx, extra: Partial<Parameters<typeof tk.createTicket>[1]> = {}) =>
  tk.createTicket(ctx, { categorySlug: "rh", subject: "Atualização de endereço", description: "Mudei de endereço e preciso atualizar.", ...extra });

describe("abertura", () => {
  it("gera protocolo sequencial e prazos a partir da política vigente (minutos úteis)", async () => {
    const a = await newTicket(carlos);
    const b = await newTicket(carlos);
    expect(b.number).toBe(a.number + 1);
    const [row] = await getDb().select().from(tickets).where(eq(tickets.id, a.id));
    const [policy] = await getDb().select().from(slaPolicies).where(eq(slaPolicies.id, row.slaPolicyId!));
    expect(policy.resolutionMinutes).toBe(1800);
    const cal = (await tk.loadCalendar(policy.calendarId))!;
    expect(businessMinutesBetween(row.createdAt, row.resolutionDueAt!, cal)).toBe(1800);
    const events = await getDb().select().from(ticketEvents).where(eq(ticketEvents.ticketId, a.id));
    expect(events.map((e) => e.type)).toEqual(["created"]);
  });

  it("sem política aplicável não inventa prazo", async () => {
    const [cat] = await getDb().select().from(ticketCategories).where(eq(ticketCategories.slug, "facilities"));
    await getDb().update(slaPolicies).set({ supersededAt: new Date() }).where(eq(slaPolicies.categoryId, cat.id));
    const t = await newTicket(carlos, { categorySlug: "facilities" });
    expect(t.resolutionDueAt).toBeNull();
    expect((await tk.getMyTicket(carlos, t.number)).sla.kind).toBe("none");
  });

  it("valida categoria e limita anexos; aceita anexos válidos", async () => {
    await expect(newTicket(carlos, { categorySlug: "inexistente" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const files = Array.from({ length: 6 }, (_, i) => ({ name: `a${i}.pdf`, bytes: makeDemoPdf("x", []) }));
    await expect(newTicket(carlos, { files })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const ok = await newTicket(carlos, { files: files.slice(0, 2) });
    expect((await tk.getMyTicket(carlos, ok.number)).attachments).toHaveLength(2);
  });

  it("API: multipart com validação por campo", async () => {
    const cookie = await sessionCookie(people.carlos.user.id);
    const bad = new FormData();
    bad.set("categorySlug", "ti");
    bad.set("subject", "ab");
    bad.set("description", "curta");
    const r1 = await ticketsPost(apiRequest("/api/v1/tickets", { method: "POST", body: bad, cookie }), params({}));
    expect(r1.status).toBe(422);
    const details = (await r1.json()).error.details;
    expect(Object.keys(details).sort()).toEqual(["description", "subject"]);
    const ok = new FormData();
    ok.set("categorySlug", "ti");
    ok.set("subject", "Sem acesso ao e-mail");
    ok.set("description", "Desde ontem não consigo acessar meu e-mail corporativo.");
    const r2 = await ticketsPost(apiRequest("/api/v1/tickets", { method: "POST", body: ok, cookie }), params({}));
    expect(r2.status).toBe(201);
  });
});

describe("ciclo de vida e SLA", () => {
  it("pausa ao aguardar o colaborador e retoma deslocando o vencimento", async () => {
    const t = await newTicket(carlos);
    await tk.agentReply(mariana, t.number, { body: "Qual o novo CEP?", setStatus: "aguardando_colaborador" });
    let [row] = await getDb().select().from(tickets).where(eq(tickets.id, t.id));
    expect(row.status).toBe("aguardando_colaborador");
    expect(row.pausedAt).not.toBeNull();
    expect(row.firstRespondedAt).not.toBeNull();
    const dueBefore = row.resolutionDueAt!;
    await getDb().execute(sql`update tickets set paused_at = paused_at - interval '4 days' where id = ${t.id}`);
    await tk.addRequesterMessage(carlos, t.number, { body: "CEP 01001-000" });
    [row] = await getDb().select().from(tickets).where(eq(tickets.id, t.id));
    expect(row.status).toBe("em_andamento");
    expect(row.pausedAt).toBeNull();
    expect(row.pausedBusinessMinutes).toBeGreaterThan(0);
    expect(row.resolutionDueAt!.getTime()).toBeGreaterThan(dueBefore.getTime());
    const types = (await getDb().select().from(ticketEvents).where(eq(ticketEvents.ticketId, t.id))).map((e) => e.type);
    expect(types).toEqual(expect.arrayContaining(["sla_paused", "sla_resumed", "status_changed", "message_added"]));
    const notes = await getDb().select().from(notifications).where(and(eq(notifications.userId, people.carlos.user.id), eq(notifications.entityId, t.id)));
    expect(notes.length).toBeGreaterThan(0);
  });

  it("nota interna nunca aparece para o solicitante", async () => {
    const t = await newTicket(carlos);
    await tk.agentReply(mariana, t.number, { body: "NOTA INTERNA: verificar com DP", internal: true });
    const view = await tk.getMyTicket(carlos, t.number);
    expect(view.messages.some((m) => m.body.includes("NOTA INTERNA"))).toBe(false);
  });

  it("confirmação encerra; reabertura só dentro da janela; transições inválidas recusadas", async () => {
    const t = await newTicket(carlos);
    await expect(tk.agentChangeStatus(carlos, t.number, "em_andamento")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await tk.agentReply(mariana, t.number, { body: "Atualizado!", setStatus: "respondido" });
    await tk.confirmResolution(carlos, t.number);
    expect((await tk.getMyTicket(carlos, t.number)).status).toBe("fechado");
    await expect(tk.addRequesterMessage(carlos, t.number, { body: "oi" })).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    await expect(tk.cancelMyTicket(carlos, t.number)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });

    const t2 = await newTicket(carlos);
    await tk.agentChangeStatus(mariana, t2.number, "resolvido");
    await tk.reopenMyTicket(carlos, t2.number, "Ainda está errado.");
    expect((await tk.getMyTicket(carlos, t2.number)).status).toBe("em_andamento");
    await tk.agentChangeStatus(mariana, t2.number, "resolvido");
    await getDb().execute(sql`update tickets set resolved_at = now() - interval '8 days' where id = ${t2.id}`);
    await expect(tk.reopenMyTicket(carlos, t2.number, "De novo")).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  });

  it("concorrência: apenas um cancelamento simultâneo vence", async () => {
    const t = await newTicket(carlos);
    const results = await Promise.allSettled([tk.cancelMyTicket(carlos, t.number), tk.cancelMyTicket(carlos, t.number)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await tk.getMyTicket(carlos, t.number)).status).toBe("cancelado");
  });

  it("monitor de SLA: violação (idempotente) e fechamento automático", async () => {
    const t = await newTicket(carlos);
    await tk.agentAssign(mariana, t.number, people.mariana.user.id);
    await getDb().execute(sql`update tickets set created_at = now() - interval '30 days', resolution_due_at = now() - interval '1 hour', first_response_due_at = now() - interval '20 days' where id = ${t.id}`);
    const r = await tk.runSlaMonitor();
    expect(r.breached).toBeGreaterThanOrEqual(1);
    const [row] = await getDb().select().from(tickets).where(eq(tickets.id, t.id));
    expect(row.resolutionBreachedAt).not.toBeNull();
    expect(row.firstResponseBreachedAt).not.toBeNull();
    expect((await tk.runSlaMonitor()).breached).toBe(0);
    const t2 = await newTicket(carlos);
    await tk.agentChangeStatus(mariana, t2.number, "resolvido");
    await getDb().execute(sql`update tickets set resolved_at = now() - interval '8 days' where id = ${t2.id}`);
    await tk.runSlaMonitor();
    expect((await tk.getMyTicket(carlos, t2.number)).status).toBe("fechado");
  });
});

describe("autorização", () => {
  it("IDOR: não vê nem interage com solicitação de outra pessoa", async () => {
    const ana = await ctxFor(people.ana.user);
    await expect(tk.getMyTicket(carlos, 1050)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(tk.addRequesterMessage(carlos, 1050, { body: "x" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(tk.cancelMyTicket(carlos, 1050)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(tk.getMyTicket(ana, 1048)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const res = await ticketGet(apiRequest("/api/v1/tickets/1050", { cookie: await sessionCookie(people.carlos.user.id) }), params({ number: "1050" }));
    expect(res.status).toBe(404);
    expect((await tk.listMyTickets(carlos, { q: "1050" })).total).toBe(0);
  });

  it("compartilhamento explícito permite leitura, mas não ações do solicitante", async () => {
    const [anaTicket] = await getDb().select().from(tickets).where(eq(tickets.number, 1050));
    await getDb().insert(ticketParticipants).values({ ticketId: anaTicket.id, userId: people.carlos.user.id });
    const view = await tk.getMyTicket(carlos, 1050);
    expect(view.actions).toEqual({ canReply: false, canCancel: false, canConfirm: false, canReopen: false });
    await expect(tk.cancelMyTicket(carlos, 1050)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rascunhos são privados e somem ao virar solicitação", async () => {
    const ana = await ctxFor(people.ana.user);
    const d = await tk.saveDraft(carlos, { subject: "Rascunho", description: "" });
    await expect(tk.getDraft(ana, d.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(tk.deleteDraft(ana, d.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(tk.saveDraft(ana, { id: d.id, subject: "x", description: "" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await newTicket(carlos, { draftId: d.id });
    expect((await tk.listDrafts(carlos)).some((x) => x.id === d.id)).toBe(false);
  });

  it("usuário desativado perde acesso imediatamente", async () => {
    const cookie = await sessionCookie(people.carlos.user.id);
    await getDb().update(users).set({ status: "inactive" }).where(eq(users.id, people.carlos.user.id));
    expect((await validateSessionToken(cookie.split("=")[1])).status).toBe("invalid");
  });
});
