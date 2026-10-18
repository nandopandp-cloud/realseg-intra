import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { GET as annGet } from "@/app/api/v1/announcements/[id]/route";
import { POST as annAck } from "@/app/api/v1/announcements/[id]/acknowledge/route";
import { GET as docFile } from "@/app/api/v1/documents/[id]/file/route";
import { POST as submissionsPost } from "@/app/api/v1/submissions/route";
import { getDb } from "@/server/db/client";
import { announcementReads, announcements, auditEvents, documents, documentSubmissions } from "@/server/db/schema";
import * as ann from "@/server/services/announcements";
import * as docs from "@/server/services/documents";
import { makeDemoPdf } from "../../scripts/seed/pdf";
import { apiRequest, ctxFor, params, resetDatabase, sessionCookie, type People } from "../support/db";

let people: People;
beforeEach(async () => {
  people = await resetDatabase();
});

async function annId(title: string) {
  const [a] = await getDb().select({ id: announcements.id }).from(announcements).where(eq(announcements.title, title));
  return a.id;
}

describe("comunicados", () => {
  it("visualização é registrada por versão e não confirma ciência", async () => {
    const carlos = await ctxFor(people.carlos.user);
    const id = await annId("Atualização no uso do uniforme");
    await ann.markAnnouncementRead(carlos, id);
    await ann.markAnnouncementRead(carlos, id);
    const reads = await getDb().select().from(announcementReads).where(and(eq(announcementReads.announcementId, id), eq(announcementReads.userId, carlos.actor.userId)));
    expect(reads).toHaveLength(1);
    const a = await ann.getAnnouncement(carlos, id);
    expect(a.isRead).toBe(true);
    expect(a.acknowledgedAt).toBeNull();
    expect((await ann.listAnnouncements(carlos)).counts.naoLidos).toBe(2);
  });

  it("ciência explícita é idempotente, auditada e exigida apenas quando configurada", async () => {
    const carlos = await ctxFor(people.carlos.user);
    const id = await annId("Atualização no uso do uniforme");
    const first = await ann.acknowledgeAnnouncement(carlos, id);
    const second = await ann.acknowledgeAnnouncement(carlos, id);
    expect(second.acknowledgedAt?.getTime()).toBe(first.acknowledgedAt?.getTime());
    const audits = await getDb().select().from(auditEvents).where(and(eq(auditEvents.action, "announcement.acknowledged"), eq(auditEvents.entityId, id)));
    expect(audits).toHaveLength(1);
    await expect(ann.acknowledgeAnnouncement(carlos, await annId("SIPAT 2026"))).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  });

  it("nova versão do comunicado exige nova ciência", async () => {
    const carlos = await ctxFor(people.carlos.user);
    const id = await annId("Atualização da política de privacidade (LGPD)");
    expect((await ann.getAnnouncement(carlos, id)).acknowledgedAt).not.toBeNull();
    await getDb().update(announcements).set({ version: 2 }).where(eq(announcements.id, id));
    const a = await ann.getAnnouncement(carlos, id);
    expect(a.acknowledgedAt).toBeNull();
    expect(a.isRead).toBe(false);
  });

  it("página de leitura: público-alvo legível, relacionados por tags e só do que o ator vê", async () => {
    const carlos = await ctxFor(people.carlos.user);
    const page = await ann.getAnnouncementPage(carlos, await annId("Atualização no uso do uniforme"));
    expect(page.audience).toEqual(["Todos os colaboradores"]);
    expect(page.highlights).toHaveLength(3);
    // 2 tags em comum cada; empate decidido pela mesma categoria (Operações).
    expect(page.related.map((r) => r.title)).toEqual(["Modelos de crachá e utilização correta", "Boas práticas de segurança no dia a dia"]);
    expect(page.related.every((r) => r.title !== "Mudança de escala na Unidade Rio de Janeiro")).toBe(true);
    // Unidade como público: rótulo com o nome da unidade (visto por quem é da unidade).
    const ana = await ctxFor(people.ana.user);
    const rj = await ann.getAnnouncementPage(ana, await annId("Mudança de escala na Unidade Rio de Janeiro"));
    expect(rj.audience).toEqual(["Unidade Rio de Janeiro"]);
    // Do ponto de vista da Ana, o comunicado do RJ pode ser relacionado; do Carlos, nunca.
    for (const id of [await annId("Modelos de crachá e utilização correta"), await annId("Atualização no uso do uniforme")]) {
      const p = await ann.getAnnouncementPage(carlos, id);
      expect(p.related.map((r) => r.title)).not.toContain("Mudança de escala na Unidade Rio de Janeiro");
    }
  });

  it("filtro por tag", async () => {
    const carlos = await ctxFor(people.carlos.user);
    const list = await ann.listAnnouncements(carlos, { tag: "Crachá" });
    expect(list.items.map((i) => i.title).sort()).toEqual(["Atualização no uso do uniforme", "Modelos de crachá e utilização correta"]);
  });

  it("segmentação: comunicado de outra unidade, rascunho e agendado não são acessíveis", async () => {
    const carlos = await ctxFor(people.carlos.user);
    const ana = await ctxFor(people.ana.user);
    const rj = await annId("Mudança de escala na Unidade Rio de Janeiro");
    await expect(ann.getAnnouncement(carlos, rj)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(ann.getAnnouncement(ana, rj)).resolves.toBeTruthy();
    await expect(ann.getAnnouncement(carlos, await annId("Rascunho: confraternização de fim de ano"))).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(ann.setFavorite(carlos, rj, true)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const res = await annGet(apiRequest(`/api/v1/announcements/${rj}`, { cookie: await sessionCookie(people.carlos.user.id) }), params({ id: rj }));
    expect(res.status).toBe(404);
    const bad = await annGet(apiRequest(`/api/v1/announcements/nao-e-uuid`, { cookie: await sessionCookie(people.carlos.user.id) }), params({ id: "nao-e-uuid" }));
    expect(bad.status).toBe(404);
  });

  it("API de ciência exige sessão e origem válida", async () => {
    const id = await annId("Atualização no uso do uniforme");
    expect((await annAck(apiRequest(`/api/v1/announcements/${id}/acknowledge`, { method: "POST" }), params({ id }))).status).toBe(401);
    const cookie = await sessionCookie(people.carlos.user.id);
    expect((await annAck(apiRequest(`/api/v1/announcements/${id}/acknowledge`, { method: "POST", cookie, origin: "https://evil.example" }), params({ id }))).status).toBe(403);
    expect((await annAck(apiRequest(`/api/v1/announcements/${id}/acknowledge`, { method: "POST", cookie }), params({ id }))).status).toBe(200);
  });
});

describe("documentos", () => {
  async function docOf(employeeId: string, title: string) {
    const [d] = await getDb().select({ id: documents.id }).from(documents).where(and(eq(documents.ownerEmployeeId, employeeId), eq(documents.title, title)));
    return d.id;
  }

  it("holerite: dono baixa o próprio arquivo; acesso é auditado sem conteúdo", async () => {
    const id = await docOf(people.carlos.employee.id, "Holerite - Setembro/2026");
    const res = await docFile(apiRequest(`/api/v1/documents/${id}/file`, { cookie: await sessionCookie(people.carlos.user.id) }), params({ id }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("content-disposition")).toMatch(/^attachment;/);
    expect(new TextDecoder().decode(new Uint8Array(await res.arrayBuffer())).startsWith("%PDF-")).toBe(true);
    const [ev] = await getDb().select().from(auditEvents).where(and(eq(auditEvents.action, "document.downloaded"), eq(auditEvents.entityId, id)));
    expect(ev.metadata).toMatchObject({ category: "holerite", sensitive: true });
    expect(JSON.stringify(ev.metadata)).not.toMatch(/Setembro|%PDF/);
  });

  it("IDOR: holerite de outra pessoa é negado no serviço e na API (404)", async () => {
    const anaDoc = await docOf(people.ana.employee.id, "Holerite - Setembro/2026");
    const carlos = await ctxFor(people.carlos.user);
    await expect(docs.getDocument(carlos, anaDoc)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(docs.openDocumentFile(carlos, anaDoc, "attachment")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(docs.acknowledgeDocument(carlos, anaDoc)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const res = await docFile(apiRequest(`/api/v1/documents/${anaDoc}/file`, { cookie: await sessionCookie(people.carlos.user.id) }), params({ id: anaDoc }));
    expect(res.status).toBe(404);
    const anon = await docFile(apiRequest(`/api/v1/documents/${anaDoc}/file`), params({ id: anaDoc }));
    expect(anon.status).toBe(401);
    expect((await docs.listMyDocuments(carlos, { q: "Setembro" })).items.every((d) => d.id !== anaDoc)).toBe(true);
  });

  it("ciência de documento: explícita, por versão, e some da lista de pendentes", async () => {
    const carlos = await ctxFor(people.carlos.user);
    const id = await docOf(people.carlos.employee.id, "Carta de Advertência");
    await docs.openDocumentFile(carlos, id, "inline");
    expect((await docs.getDocument(carlos, id)).acknowledgedAt).toBeNull();
    await docs.acknowledgeDocument(carlos, id);
    await docs.acknowledgeDocument(carlos, id);
    expect((await docs.getDocument(carlos, id)).acknowledgedAt).not.toBeNull();
    expect((await docs.pendingDocumentAcks(carlos)).personal).toBe(1);
  });

  it("normas institucionais são visíveis a todos os colaboradores", async () => {
    const joao = await ctxFor(people.joao.user);
    const pols = await docs.listPolicies(joao);
    await expect(docs.getDocument(joao, pols[0].id)).resolves.toMatchObject({ scope: "institutional" });
  });
});

describe("envio de documentos (upload)", () => {
  const pdf = () => makeDemoPdf("Atestado", ["teste"]);
  const sizeOf = async (dir: string) => (await import("node:fs")).readdirSync(dir, { recursive: true }).length;

  it("aceita PDF válido, gera protocolo e histórico", async () => {
    const carlos = await ctxFor(people.carlos.user);
    const r = await docs.createSubmission(carlos, { categorySlug: "atestado-medico", title: "Atestado 15/10", file: { name: "atestado.pdf", bytes: pdf() } });
    expect(r.number).toBeGreaterThanOrEqual(1000);
    const s = await docs.getMySubmission(carlos, r.id);
    expect(s.status).toBe("enviado");
    expect(s.events.map((e) => e.toStatus)).toEqual(["enviado"]);
    expect(s.file?.scanStatus).toBe("skipped");
  });

  it("rejeita extensão proibida, conteúdo falsificado, PDF com script e arquivo grande", async () => {
    const carlos = await ctxFor(people.carlos.user);
    const before = await sizeOf(".data/storage-test").catch(() => 0);
    const send = (name: string, bytes: Uint8Array) => docs.createSubmission(carlos, { categorySlug: "atestado-medico", title: "Teste", file: { name, bytes } });
    await expect(send("virus.exe", new Uint8Array([77, 90, 0, 0]))).rejects.toMatchObject({ code: "UNSUPPORTED_FILE" });
    await expect(send("falso.pdf", new TextEncoder().encode("<html><script>alert(1)</script></html>"))).rejects.toMatchObject({ code: "UNSUPPORTED_FILE" });
    await expect(send("foto.png", pdf())).rejects.toMatchObject({ code: "UNSUPPORTED_FILE" });
    await expect(send("ativo.pdf", new TextEncoder().encode("%PDF-1.4\n1 0 obj << /OpenAction << /S /JavaScript /JS (app.alert(1)) >> >> endobj"))).rejects.toMatchObject({ code: "UNSUPPORTED_FILE" });
    const big = new Uint8Array(10 * 1024 * 1024 + 1);
    big.set([0x25, 0x50, 0x44, 0x46, 0x2d]);
    await expect(send("grande.pdf", big)).rejects.toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
    await expect(send("vazio.pdf", new Uint8Array())).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(await sizeOf(".data/storage-test").catch(() => 0)).toBe(before);
  });

  it("API multipart: valida campos e exige arquivo", async () => {
    const cookie = await sessionCookie(people.carlos.user.id);
    const fd = new FormData();
    fd.set("categorySlug", "atestado-medico");
    fd.set("title", "x");
    const res = await submissionsPost(apiRequest("/api/v1/submissions", { method: "POST", body: fd, cookie }), params({}));
    expect(res.status).toBe(422);
    const ok = new FormData();
    ok.set("categorySlug", "declaracao");
    ok.set("title", "Declaração escolar");
    ok.set("file", new File([pdf() as BlobPart], "declaracao.pdf", { type: "application/pdf" }));
    const created = await submissionsPost(apiRequest("/api/v1/submissions", { method: "POST", body: ok, cookie }), params({}));
    expect(created.status).toBe(201);
  });

  it("cancelamento: só enquanto 'enviado', com controle de concorrência", async () => {
    const carlos = await ctxFor(people.carlos.user);
    const r = await docs.createSubmission(carlos, { categorySlug: "declaracao", title: "Declaração", file: { name: "d.pdf", bytes: pdf() } });
    const results = await Promise.allSettled([docs.cancelSubmission(carlos, r.id), docs.cancelSubmission(carlos, r.id)]);
    expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    const [row] = await getDb().select().from(documentSubmissions).where(eq(documentSubmissions.id, r.id));
    expect(row.status).toBe("cancelado");
    const inReview = (await docs.listMySubmissions(carlos)).find((s) => s.status === "em_analise")!;
    await expect(docs.cancelSubmission(carlos, inReview.id)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  });

  it("IDOR: envio de outra pessoa não é acessível", async () => {
    const carlos = await ctxFor(people.carlos.user);
    const ana = await ctxFor(people.ana.user);
    const anaSub = (await docs.listMySubmissions(ana))[0];
    await expect(docs.getMySubmission(carlos, anaSub.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(docs.openSubmissionFile(carlos, anaSub.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(docs.cancelSubmission(carlos, anaSub.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
