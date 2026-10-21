import { and, eq, isNull } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/server/db/client";
import { slaPolicies, ticketCategories, tickets } from "@/server/db/schema";
import * as announcements from "@/server/services/announcements";
import * as help from "@/server/services/help";
import * as tk from "@/server/services/tickets";
import * as rhAudit from "@/server/services/rh/audit-log";
import * as rhEvents from "@/server/services/rh/events";
import * as rhHelp from "@/server/services/rh/help";
import * as settings from "@/server/services/rh/settings";
import { ctxFor, resetDatabase, type People } from "../support/db";
import type { Ctx } from "@/server/auth/actor";

let people: People;
let carlos: Ctx;
let mariana: Ctx;
let lucas: Ctx;

beforeEach(async () => {
  people = await resetDatabase();
  carlos = await ctxFor(people.carlos.user);
  mariana = await ctxFor(people.mariana.user);
  lucas = await ctxFor(people.lucas.user);
});

describe("central de ajuda", () => {
  it("artigo novo é rascunho (invisível), publicado aparece na busca; endereço único", async () => {
    const input: rhHelp.ArticleInput = { title: "Como trocar o uniforme", summary: "Passo a passo para pedir a troca.", body: "Abra uma solicitação para Serviços.", categorySlug: "recursos-humanos", type: "tutorial", icon: "shirt", color: "teal", ticketCategorySlug: "servicos" };
    const a = await rhHelp.saveArticle(mariana, null, input);
    const b = await rhHelp.saveArticle(mariana, null, input);
    const [ra, rb] = await Promise.all([rhHelp.getArticleAdmin(mariana, a.id), rhHelp.getArticleAdmin(mariana, b.id)]);
    expect([ra.slug, rb.slug]).toEqual(["como-trocar-o-uniforme", "como-trocar-o-uniforme-2"]);
    expect((await help.searchArticles(carlos, { q: "uniforme" })).some((x) => x.id === a.id)).toBe(false);
    await rhHelp.setArticleStatus(mariana, a.id, "published");
    expect((await help.searchArticles(carlos, { q: "trocar o uniforme" })).map((x) => x.id)).toContain(a.id);
    expect((await help.getArticle(carlos, ra.slug)).title).toBe("Como trocar o uniforme");
    await expect(rhHelp.saveArticle(carlos, null, input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const cat = await rhHelp.saveHelpCategory(mariana, null, { name: "Benefícios", description: "Vale-alimentação e plano de saúde", color: "green", icon: "star" });
    expect((await help.helpCategoriesWithCounts(carlos)).some((c) => c.id === cat.id)).toBe(true);
  });
});

describe("agenda", () => {
  it("evento por unidade aparece só para a unidade; cancelado some", async () => {
    const [sp] = await getDb().execute<{ id: string }>(`SELECT id FROM units WHERE name = 'Sede Administrativa'` as never).then((r) => r.rows);
    const e = await rhEvents.saveEvent(mariana, null, { title: "Treinamento de brigada", description: null, location: "Auditório", startsAt: new Date(Date.now() + 86400_000).toISOString(), endsAt: null, unitId: sp.id, announcementId: null });
    const anaCtx = await ctxFor(people.ana.user);
    expect((await announcements.upcomingEvents(carlos, 10)).some((x) => x.id === e.id)).toBe(true);
    expect((await announcements.upcomingEvents(anaCtx, 10)).some((x) => x.id === e.id)).toBe(false);
    await rhEvents.setEventStatus(mariana, e.id, "cancelled");
    expect((await announcements.upcomingEvents(carlos, 10)).some((x) => x.id === e.id)).toBe(false);
    await expect(rhEvents.saveEvent(mariana, null, { title: "X", description: null, location: null, startsAt: new Date().toISOString(), endsAt: new Date(Date.now() - 3600_000).toISOString(), unitId: null, announcementId: null })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("configurações (administrador)", () => {
  it("RH não configura SLA; administrador sim", async () => {
    await expect(settings.slaMatrix(mariana)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const m = await settings.slaMatrix(lucas);
    expect(m.rows.length).toBeGreaterThanOrEqual(4);
    expect(m.minutesPerDay).toBe(600);
  });

  it("nova política vale para novas solicitações e preserva a versão anterior", async () => {
    const [rh] = await getDb().select().from(ticketCategories).where(eq(ticketCategories.slug, "rh"));
    await settings.saveSlaPolicy(lucas, { categoryId: rh.id, priority: "normal", firstResponseMinutes: 60, resolutionMinutes: 600, warnAtPercent: 70 });
    const active = await getDb().select().from(slaPolicies).where(and(eq(slaPolicies.categoryId, rh.id), eq(slaPolicies.priority, "normal"), isNull(slaPolicies.supersededAt)));
    expect(active).toHaveLength(1);
    expect(active[0].resolutionMinutes).toBe(600);
    expect((await settings.slaHistory(lucas, rh.id)).filter((p) => p.priority === "normal")).toHaveLength(2);
    const t = await tk.createTicket(carlos, { categorySlug: "rh", subject: "Teste de prazo", description: "Verificar novo SLA de resolução." });
    const [row] = await getDb().select().from(tickets).where(eq(tickets.id, t.id));
    expect(row.slaPolicyId).toBe(active[0].id);
    await expect(settings.saveSlaPolicy(lucas, { categoryId: rh.id, priority: "alta", firstResponseMinutes: 700, resolutionMinutes: 600, warnAtPercent: 80 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("feriado e expediente alteram o horário de atendimento exibido", async () => {
    await settings.saveWorkingHours(lucas, { "1": [["09:00", "17:00"]], "2": [["09:00", "17:00"]], "3": [["09:00", "17:00"]], "4": [["09:00", "17:00"]], "5": [["09:00", "17:00"]], "6": [["09:00", "12:00"]] });
    expect((await tk.supportHours())?.label).toBe("Conforme calendário");
    await settings.saveWorkingHours(lucas, { "1": [["09:00", "17:00"]], "2": [["09:00", "17:00"]], "3": [["09:00", "17:00"]], "4": [["09:00", "17:00"]], "5": [["09:00", "17:00"]] });
    expect(await tk.supportHours()).toMatchObject({ label: "Segunda a sexta", hours: "09h às 17h" });
    const h = await settings.addHoliday(lucas, { date: "2026-11-27", name: "Aniversário da cidade (municipal)" });
    await expect(settings.addHoliday(lucas, { date: "2026-11-27", name: "Duplicado" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect((await settings.calendarSettings(lucas))!.holidays.some((x) => x.id === h.id)).toBe(true);
    await settings.deleteHoliday(lucas, h.id);
    await expect(settings.saveWorkingHours(lucas, { "1": [["18:00", "08:00"]] })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("nova área de atendimento aparece para o colaborador abrir solicitações", async () => {
    await settings.saveTicketCategory(lucas, null, { name: "Jurídico", description: "Dúvidas legais", color: "slate", icon: "briefcase", defaultPriority: "normal", active: true });
    expect((await tk.listTicketCategories()).map((c) => c.slug)).toContain("juridico");
  });
});

describe("auditoria", () => {
  it("lista e filtra a trilha; exportação é auditada; RH sem permissão de auditoria", async () => {
    await expect(rhAudit.listAudit(mariana)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await tk.createTicket(carlos, { categorySlug: "rh", subject: "Auditoria de teste", description: "Gera um evento de auditoria." });
    const r = await rhAudit.listAudit(lucas, { group: "ticket" });
    expect(r.items.length).toBeGreaterThan(0);
    expect(r.items.every((i) => i.action.startsWith("ticket."))).toBe(true);
    const byActor = await rhAudit.listAudit(lucas, { actor: "100231", group: "ticket" });
    expect(byActor.items.every((i) => i.actorRegistration === "100231")).toBe(true);
    const csv = await rhAudit.auditCsv(lucas, { group: "ticket" });
    expect(csv.csv.split("\r\n")[0]).toContain("Data;Ação;Quem");
    expect((await rhAudit.listAudit(lucas, { group: "report" })).items[0].action).toBe("report.exported");
  });
});
