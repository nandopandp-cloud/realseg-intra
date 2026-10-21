import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { POST as createPost } from "@/app/api/v1/rh/announcements/route";
import { GET as reportGet } from "@/app/api/v1/rh/announcements/[id]/report/route";
import { POST as mediaPost } from "@/app/api/v1/rh/media/route";
import { GET as mediaGet } from "@/app/api/v1/media/[id]/route";
import { getDb } from "@/server/db/client";
import { announcements, auditEvents, departments, notifications, units } from "@/server/db/schema";
import * as ann from "@/server/services/announcements";
import * as rh from "@/server/services/rh/announcements";
import type { AnnouncementInput } from "@/lib/validation/rh";
import { apiRequest, ctxFor, params, resetDatabase, sessionCookie, type People } from "../support/db";
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

const input = (patch: Partial<AnnouncementInput> = {}): AnnouncementInput => ({
  title: "Treinamento de brigada",
  summary: "Inscrições abertas para a turma de novembro.",
  body: "## Como participar\n\n- Abra uma solicitação\n- Aguarde a confirmação",
  categorySlug: "institucional",
  coverImage: null,
  effectiveNote: null,
  highlights: [{ icon: "calendar", title: "Data", text: "Dia 10 de novembro" }],
  tags: ["brigada"],
  supportTicketCategory: "rh",
  isImportant: true,
  requiresAck: true,
  isFeatured: false,
  authorLabel: "Recursos Humanos",
  audience: { all: true, department: [], unit: [], job_position: [], job_family: [] },
  ...patch,
});

const visibleTo = async (ctx: Ctx, id: string) => (await ann.listAnnouncements(ctx, { pageSize: 50 })).items.some((i) => i.id === id);

describe("permissões", () => {
  it("colaborador não gerencia comunicados", async () => {
    await expect(rh.createAnnouncement(carlos, input())).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(rh.listAnnouncementsAdmin(carlos)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(rh.readingReport(carlos, "00000000-0000-4000-8000-000000000000")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("valida categoria, público e área de dúvidas", async () => {
    await expect(rh.createAnnouncement(mariana, input({ categorySlug: "nao-existe" }))).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(rh.createAnnouncement(mariana, input({ supportTicketCategory: "nao-existe" }))).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(rh.createAnnouncement(mariana, input({ audience: { all: false, department: ["00000000-0000-4000-8000-000000000000"], unit: [], job_position: [], job_family: [] } }))).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const cookie = await sessionCookie(people.mariana.user.id);
    const res = await createPost(apiRequest("/api/v1/rh/announcements", { method: "POST", json: { ...input(), audience: { all: false, department: [], unit: [], job_position: [], job_family: [] } }, cookie }), params({}));
    expect(res.status).toBe(422);
    expect((await res.json()).error.details["audience.all"]).toBeDefined();
  });
});

describe("ciclo de vida", () => {
  it("rascunho não aparece; publicado aparece para o público e avisa", async () => {
    const { id } = await rh.createAnnouncement(mariana, input());
    expect(await visibleTo(carlos, id)).toBe(false);
    await rh.publishAnnouncement(mariana, id, { mode: "now" });
    expect(await visibleTo(carlos, id)).toBe(true);
    const page = await ann.getAnnouncementPage(carlos, id);
    expect(page.highlights).toEqual([{ icon: "calendar", title: "Data", text: "Dia 10 de novembro" }]);
    expect(page.supportTicketCategory).toBe("rh");
    const n = await getDb().select().from(notifications).where(eq(notifications.entityId, id));
    expect(n.length).toBe(6); // todos os colaboradores da demonstração
    expect(n[0].title).toBe("Comunicado importante: Treinamento de brigada");
    await expect(rh.publishAnnouncement(mariana, id, { mode: "now" })).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  });

  it("público por unidade: só quem é da unidade vê e é avisado", async () => {
    const [rj] = await getDb().select().from(units).where(eq(units.name, "Unidade Rio de Janeiro"));
    const { id } = await rh.createAnnouncement(mariana, input({ audience: { all: false, department: [], unit: [rj.id], job_position: [], job_family: [] } }));
    await rh.publishAnnouncement(mariana, id, { mode: "now" });
    expect(await visibleTo(ana, id)).toBe(true);
    expect(await visibleTo(carlos, id)).toBe(false);
    const n = await getDb().select().from(notifications).where(eq(notifications.entityId, id));
    expect(n.map((x) => x.userId)).toEqual([people.ana.user.id]);
    const r = await rh.readingReport(mariana, id);
    expect(r.totals.audience).toBe(1);
  });

  it("agendado fica visível na hora marcada e o job publica e avisa uma única vez", async () => {
    const { id } = await rh.createAnnouncement(mariana, input());
    const at = new Date(Date.now() + 3600_000);
    await rh.publishAnnouncement(mariana, id, { mode: "schedule", publishAt: at.toISOString() });
    expect(await visibleTo(carlos, id)).toBe(false);
    expect(await rh.publishDueAnnouncements()).toBe(0);
    await getDb().update(announcements).set({ publishAt: new Date(Date.now() - 1000), publishedAt: new Date(Date.now() - 1000) }).where(eq(announcements.id, id));
    expect(await visibleTo(carlos, id)).toBe(true); // visível mesmo antes do job
    expect(await rh.publishDueAnnouncements()).toBe(1);
    expect(await rh.publishDueAnnouncements()).toBe(0);
    const [row] = await getDb().select().from(announcements).where(eq(announcements.id, id));
    expect(row.status).toBe("published");
    expect((await getDb().select().from(notifications).where(eq(notifications.entityId, id))).length).toBe(6);
  });

  it("alteração relevante gera nova versão: ciência recomeça", async () => {
    const { id } = await rh.createAnnouncement(mariana, input());
    await rh.publishAnnouncement(mariana, id, { mode: "now", notify: false });
    await ann.acknowledgeAnnouncement(carlos, id);
    expect((await rh.readingReport(mariana, id)).totals.acknowledged).toBe(1);
    await rh.updateAnnouncement(mariana, id, input({ title: "Treinamento de brigada (nova data)" }));
    expect((await rh.readingReport(mariana, id)).totals.acknowledged).toBe(1); // ajuste simples mantém a versão
    await rh.updateAnnouncement(mariana, id, input({ title: "Treinamento de brigada (nova data)", relevantChange: true }));
    const r = await rh.readingReport(mariana, id, { filter: "pendentes" });
    expect(r.announcement.version).toBe(2);
    expect(r.totals.acknowledged).toBe(0);
    expect(r.items.some((i) => i.registration === "100231")).toBe(true);
    const updated = await getDb().select().from(notifications).where(eq(notifications.entityId, id));
    expect(updated.every((n) => n.title.startsWith("Comunicado atualizado"))).toBe(true);
  });

  it("arquivar oculta; restaurar volta a rascunho; só rascunho pode ser excluído", async () => {
    const { id } = await rh.createAnnouncement(mariana, input());
    await expect(rh.archiveAnnouncement(mariana, id)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    await rh.publishAnnouncement(mariana, id, { mode: "now", notify: false });
    await expect(rh.deleteAnnouncement(mariana, id)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    await rh.archiveAnnouncement(mariana, id);
    expect(await visibleTo(carlos, id)).toBe(false);
    await expect(rh.updateAnnouncement(mariana, id, input())).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    await rh.restoreAnnouncement(mariana, id);
    await rh.deleteAnnouncement(mariana, id);
    expect(await getDb().select().from(announcements).where(eq(announcements.id, id))).toHaveLength(0);
    const audits = await getDb().select({ action: auditEvents.action }).from(auditEvents).where(eq(auditEvents.entityId, id));
    expect(audits.map((a) => a.action)).toEqual(expect.arrayContaining(["announcement.created", "announcement.published", "announcement.archived", "announcement.deleted"]));
  });

  it("duplicar cria rascunho com o mesmo público", async () => {
    const [dep] = await getDb().select().from(departments).limit(1);
    const { id } = await rh.createAnnouncement(mariana, input({ audience: { all: false, department: [dep.id], unit: [], job_position: [], job_family: [] } }));
    const copy = await rh.duplicateAnnouncement(mariana, id);
    const a = await rh.getAnnouncementAdmin(mariana, copy.id);
    expect(a.status).toBe("draft");
    expect(a.audience.department).toEqual([dep.id]);
  });
});

describe("relatório e mídia", () => {
  it("CSV de leitura exige permissão de exportação e é auditado", async () => {
    const { id } = await rh.createAnnouncement(mariana, input());
    await rh.publishAnnouncement(mariana, id, { mode: "now", notify: false });
    await ann.markAnnouncementRead(carlos, id);
    const res = await reportGet(apiRequest(`/api/v1/rh/announcements/${id}/report`, { cookie: await sessionCookie(people.mariana.user.id) }), params({ id }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    const csv = await res.text();
    expect(csv.split("\r\n")[0]).toContain("Nome;Matrícula");
    expect(csv).toContain("Carlos Silva;100231");
    const audits = await getDb().select().from(auditEvents).where(eq(auditEvents.action, "report.exported"));
    expect(audits).toHaveLength(1);
  });

  it("capa enviada só é servida ao autor ou quando está em uso", async () => {
    const png = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"));
    const fd = new FormData();
    fd.set("file", new File([png as BlobPart], "capa.png", { type: "image/png" }));
    const up = await mediaPost(apiRequest("/api/v1/rh/media", { method: "POST", body: fd, cookie: await sessionCookie(people.mariana.user.id) }), params({}));
    expect(up.status).toBe(201);
    const { id: mediaId, url } = await up.json();
    const get = (userId: string) => sessionCookie(userId).then((cookie) => mediaGet(apiRequest(url, { cookie }), params({ id: mediaId })));
    expect((await get(people.mariana.user.id)).status).toBe(200);
    expect((await get(people.carlos.user.id)).status).toBe(404);
    const { id } = await rh.createAnnouncement(mariana, input({ coverImage: url }));
    expect(id).toBeTruthy();
    expect((await get(people.carlos.user.id)).status).toBe(200);
    // PDF não serve como capa.
    const pdf = new FormData();
    pdf.set("file", new File([Buffer.from("%PDF-1.4\n%%EOF") as BlobPart], "x.pdf", { type: "application/pdf" }));
    const bad = await mediaPost(apiRequest("/api/v1/rh/media", { method: "POST", body: pdf, cookie: await sessionCookie(people.mariana.user.id) }), params({}));
    expect(bad.status).toBe(415);
  });
});
