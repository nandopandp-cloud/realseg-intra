import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { POST as personalPost } from "@/app/api/v1/rh/documents/personal/route";
import { GET as versionGet } from "@/app/api/v1/rh/documents/[id]/versions/[versionId]/route";
import { getDb } from "@/server/db/client";
import { auditEvents, documentSubmissions, notifications } from "@/server/db/schema";
import * as docs from "@/server/services/documents";
import * as rh from "@/server/services/rh/documents";
import { makeDemoPdf } from "../../scripts/seed/pdf";
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

const file = (name = "documento.pdf") => ({ name, bytes: makeDemoPdf("Documento", ["Linha"]) });

describe("distribuição de documentos pessoais", () => {
  it("só o destinatário vê; título automático pela competência; aviso sem dados sensíveis", async () => {
    const r = await rh.distributePersonalDocument(mariana, { employeeId: people.carlos.employee.id, categorySlug: "holerite", referencePeriod: "2026-09", requiresAck: false, file: file() });
    expect(r.title).toBe("Holerite - Setembro/2026");
    expect((await docs.listMyDocuments(carlos, { pageSize: 50 })).items.some((d) => d.id === r.id)).toBe(true);
    await expect(docs.getDocument(ana, r.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const [n] = await getDb().select().from(notifications).where(eq(notifications.entityId, r.id));
    expect(n.userId).toBe(people.carlos.user.id);
    expect(n.title).toBe("Novo documento disponível: Holerite - Setembro/2026");
  });

  it("valida tipo (somente pessoal) e colaborador; colaborador não distribui", async () => {
    await expect(rh.distributePersonalDocument(mariana, { employeeId: people.carlos.employee.id, categorySlug: "normas-procedimentos", requiresAck: false, file: file() })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(rh.distributePersonalDocument(mariana, { employeeId: "00000000-0000-4000-8000-000000000000", categorySlug: "holerite", requiresAck: false, file: file() })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(rh.distributePersonalDocument(carlos, { employeeId: people.carlos.employee.id, categorySlug: "holerite", requiresAck: false, file: file() })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("API multipart: distribui e o RH baixa a versão (auditado como acesso do RH)", async () => {
    const cookie = await sessionCookie(people.mariana.user.id);
    const fd = new FormData();
    fd.set("employeeId", people.ana.employee.id);
    fd.set("categorySlug", "comunicado-individual");
    fd.set("title", "Aviso de férias");
    fd.set("requiresAck", "true");
    fd.set("file", new File([makeDemoPdf("Férias", []) as BlobPart], "ferias.pdf", { type: "application/pdf" }));
    const res = await personalPost(apiRequest("/api/v1/rh/documents/personal", { method: "POST", body: fd, cookie }), params({}));
    expect(res.status).toBe(201);
    const { id } = await res.json();
    const d = await rh.getDocumentAdmin(mariana, id);
    expect(d.owner?.name).toBe("Ana Souza");
    expect(d.ack.ownerAckAt).toBeNull();
    const dl = await versionGet(apiRequest(`/api/v1/rh/documents/${id}/versions/${d.currentVersionId}`, { cookie }), params({ id, versionId: d.currentVersionId! }));
    expect(dl.status).toBe(200);
    const audits = await getDb().select().from(auditEvents).where(and(eq(auditEvents.entityId, id), eq(auditEvents.action, "document.downloaded")));
    expect(audits[0].actorUserId).toBe(people.mariana.user.id);
    // O acesso do RH não conta como "primeiro acesso" do colaborador.
    expect((await rh.getDocumentAdmin(mariana, id)).ownerFirstAccess).toBeNull();
    await docs.acknowledgeDocument(ana, id);
    expect((await rh.getDocumentAdmin(mariana, id)).ack.ownerAckAt).not.toBeNull();
  });

  it("lote: associa pela matrícula e recusa nomes sem matrícula, ambíguos ou repetidos", async () => {
    const r = await rh.matchBatchFiles(mariana, ["100231_holerite.pdf", "holerite_100198_set.pdf", "sem-matricula.pdf", "100231_100198.pdf", "999999.pdf", "100402-a.pdf", "100402-b.pdf"]);
    expect(r.map((x) => (x.ok ? x.employee.registration : x.reason))).toEqual([
      "100231",
      "100198",
      "Nenhuma matrícula encontrada no nome do arquivo.",
      "Mais de uma matrícula no nome do arquivo.",
      "Matrícula 999999 não cadastrada.",
      "Mais de um arquivo para João Pereira.",
      "Mais de um arquivo para João Pereira.",
    ]);
  });

  it("nova versão reinicia a ciência; remoção por engano oculta e audita o motivo", async () => {
    const { id } = await rh.distributePersonalDocument(mariana, { employeeId: people.carlos.employee.id, categorySlug: "administrativo", title: "Advertência", requiresAck: true, file: file() });
    await docs.acknowledgeDocument(carlos, id);
    await rh.addDocumentVersion(mariana, id, { file: file("v2.pdf"), changeNote: "Correção de data" });
    expect((await rh.getDocumentAdmin(mariana, id)).ack.ownerAckAt).toBeNull();
    expect((await docs.getDocument(carlos, id)).acknowledgedAt).toBeNull();
    await expect(rh.removeDocument(mariana, id, " ")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await rh.removeDocument(mariana, id, "Enviado para a pessoa errada");
    await expect(docs.getDocument(carlos, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const [a] = await getDb().select().from(auditEvents).where(and(eq(auditEvents.entityId, id), eq(auditEvents.action, "document.removed")));
    expect(a.metadata).toEqual({ reason: "Enviado para a pessoa errada" });
  });
});

describe("normas e manuais", () => {
  it("publicada para todos, com aviso; arquivar tira da lista do colaborador", async () => {
    const { id } = await rh.createInstitutionalDocument(mariana, { categorySlug: "regulamentos-internos", title: "Código de conduta", requiresAck: true, notify: true, file: file() });
    expect((await docs.listPolicies(ana)).some((p) => p.id === id)).toBe(true);
    expect((await getDb().select().from(notifications).where(eq(notifications.entityId, id))).length).toBe(6);
    const row = (await rh.listInstitutionalAdmin(mariana)).find((p) => p.id === id)!;
    expect(row).toMatchObject({ version: 1, ackCount: 0, audience: 6 });
    await rh.setDocumentArchived(mariana, id, true);
    expect((await docs.listPolicies(ana)).some((p) => p.id === id)).toBe(false);
    await rh.setDocumentArchived(mariana, id, false);
    expect((await docs.listPolicies(ana)).some((p) => p.id === id)).toBe(true);
  });

  it("fora da vigência não aparece para o colaborador", async () => {
    const { id } = await rh.createInstitutionalDocument(mariana, { categorySlug: "manual-ponto", title: "Manual antigo", requiresAck: false, effectiveUntil: "2020-01-01", file: file() });
    expect((await docs.listPolicies(carlos)).some((p) => p.id === id)).toBe(false);
  });
});

describe("análise de envios", () => {
  const send = () => docs.createSubmission(carlos, { categorySlug: "atestado-medico", title: "Atestado consulta", file: file("atestado.pdf") });

  it("iniciar, aceitar e avisar o colaborador; colaborador não analisa", async () => {
    const s = await send();
    await expect(rh.reviewSubmission(carlos, s.id, { action: "accept", version: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const started = await rh.reviewSubmission(mariana, s.id, { action: "start", version: 1 });
    expect(started.status).toBe("em_analise");
    await expect(docs.cancelSubmission(carlos, s.id)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    await rh.reviewSubmission(mariana, s.id, { action: "accept", version: started.version });
    const mine = await docs.getMySubmission(carlos, s.id);
    expect(mine.status).toBe("aceito");
    expect(mine.events.map((e) => e.toStatus)).toEqual(["enviado", "em_analise", "aceito"]);
    const n = await getDb().select().from(notifications).where(eq(notifications.entityId, s.id));
    expect(n.map((x) => x.title)).toEqual(expect.arrayContaining([`Envio DOC-${s.number} foi aceito pelo RH`]));
  });

  it("recusa exige motivo; versão desatualizada é recusada; envio cancelado não é analisado", async () => {
    const s = await send();
    await expect(rh.reviewSubmission(mariana, s.id, { action: "refuse", version: 1 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await rh.reviewSubmission(mariana, s.id, { action: "refuse", note: "Ilegível", version: 1 });
    expect((await docs.getMySubmission(carlos, s.id)).reviewNote).toBe("Ilegível");
    await expect(rh.reviewSubmission(mariana, s.id, { action: "accept", version: 2 })).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    const s2 = await send();
    await expect(rh.reviewSubmission(mariana, s2.id, { action: "accept", version: 9 })).rejects.toMatchObject({ code: "CONFLICT" });
    await docs.cancelSubmission(carlos, s2.id);
    await expect(rh.reviewSubmission(mariana, s2.id, { action: "accept", version: 2 })).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  });

  it("listagem por situação e busca por protocolo", async () => {
    const s = await send();
    const list = await rh.listSubmissionsAdmin(mariana, { q: `DOC-${s.number}` });
    expect(list.items.map((i) => i.id)).toEqual([s.id]);
    const before = (await rh.listSubmissionsAdmin(mariana)).counts.analisar;
    await rh.reviewSubmission(mariana, s.id, { action: "accept", version: 1 });
    expect((await rh.listSubmissionsAdmin(mariana)).counts.analisar).toBe(before - 1);
    const [row] = await getDb().select().from(documentSubmissions).where(eq(documentSubmissions.id, s.id));
    expect(row.reviewerUserId).toBe(people.mariana.user.id);
  });
});
