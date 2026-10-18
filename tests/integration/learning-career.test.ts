import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { GET as feedbackGet } from "@/app/api/v1/feedbacks/[id]/route";
import { PATCH as prefsPatch } from "@/app/api/v1/me/preferences/route";
import { getDb } from "@/server/db/client";
import { achievements, certificates, courses, enrollments, feedbacks, helpArticles, internalOpportunities, lessonProgress, notifications } from "@/server/db/schema";
import type { Ctx } from "@/server/auth/actor";
import * as career from "@/server/services/career";
import * as cs from "@/server/services/courses";
import * as fb from "@/server/services/feedbacks";
import * as help from "@/server/services/help";
import * as notif from "@/server/services/notifications";
import * as profile from "@/server/services/profile";
import { apiRequest, ctxFor, params, resetDatabase, sessionCookie, type People } from "../support/db";

let people: People;
let carlos: Ctx;
let ana: Ctx;
let joao: Ctx;

beforeEach(async () => {
  people = await resetDatabase();
  [carlos, ana, joao] = await Promise.all([ctxFor(people.carlos.user), ctxFor(people.ana.user), ctxFor(people.joao.user)]);
});

describe("cursos", () => {
  it("matrícula idempotente e conclusão com certificado e conquista", async () => {
    const course = await cs.getCourse(joao, "cultura-de-seguranca");
    await cs.enroll(joao, course.id);
    await cs.enroll(joao, course.id);
    const rows = await getDb().select().from(enrollments).where(and(eq(enrollments.courseId, course.id), eq(enrollments.userId, people.joao.user.id)));
    expect(rows).toHaveLength(1);
    let last;
    for (const l of course.lessons) last = await cs.completeLesson(joao, l.id);
    expect(last).toMatchObject({ percent: 100, completedNow: true });
    expect(last!.certificateId).toBeTruthy();
    const again = await cs.completeLesson(joao, course.lessons[0].id);
    expect(again).toMatchObject({ percent: 100, completedNow: false, certificateId: null });
    const certs = await getDb().select().from(certificates);
    expect(certs.filter((c) => c.enrollmentId === rows[0].id)).toHaveLength(1);
    const ach = await getDb().select().from(achievements).where(eq(achievements.employeeId, people.joao.employee.id));
    expect(ach.map((a) => a.code)).toEqual(["first_course_completed"]);
    expect((await cs.getCourse(joao, "cultura-de-seguranca")).enrollment?.status).toBe("concluido");
  });

  it("conclusões concorrentes da mesma aula não duplicam progresso", async () => {
    const course = await cs.getCourse(joao, "lideranca-na-pratica");
    const lesson = course.lessons[0];
    await Promise.all(Array.from({ length: 5 }, () => cs.completeLesson(joao, lesson.id)));
    const [en] = await getDb().select().from(enrollments).where(and(eq(enrollments.courseId, course.id), eq(enrollments.userId, people.joao.user.id)));
    const progress = await getDb().select().from(lessonProgress).where(eq(lessonProgress.enrollmentId, en.id));
    expect(progress).toHaveLength(1);
    expect(en.progressPercent).toBe(Math.round(100 / course.lessons.length));
  });

  it("curso sem regra de certificado não emite certificado", async () => {
    await getDb().update(courses).set({ issuesCertificate: false }).where(eq(courses.slug, "cultura-de-seguranca"));
    const course = await cs.getCourse(joao, "cultura-de-seguranca");
    let r;
    for (const l of course.lessons) r = await cs.completeLesson(joao, l.id);
    expect(r).toMatchObject({ completedNow: true, certificateId: null });
  });

  it("elegibilidade: curso restrito a outro setor é inacessível", async () => {
    await expect(cs.getCourse(carlos, "gestao-administrativa")).rejects.toMatchObject({ code: "NOT_FOUND" });
    const restricted = await cs.getCourse(joao, "gestao-administrativa");
    await expect(cs.completeLesson(carlos, restricted.lessons[0].id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("certificado de outra pessoa não é acessível", async () => {
    const mine = await cs.listMyCertificates(carlos);
    await expect(cs.getMyCertificate(ana, mine[0].id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("carreira", () => {
  it("candidatura, duplicidade, retirada e nova candidatura", async () => {
    const [opp] = await career.listOpportunities(carlos);
    const applied = await career.applyToOpportunity(carlos, opp.id, "Tenho interesse");
    expect(applied.applicationStatus).toBe("enviada");
    await expect(career.applyToOpportunity(carlos, opp.id)).rejects.toMatchObject({ code: "CONFLICT" });
    await career.withdrawApplication(carlos, opp.id);
    expect((await career.getOpportunity(carlos, opp.id)).applicationStatus).toBe("retirada");
    await expect(career.withdrawApplication(carlos, opp.id)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    expect((await career.applyToOpportunity(carlos, opp.id)).applicationStatus).toBe("enviada");
  });

  it("oportunidade inelegível, em rascunho ou encerrada não é acessível", async () => {
    const all = await getDb().select().from(internalOpportunities);
    const rh = all.find((o) => o.title === "Assistente de RH")!;
    const draft = all.find((o) => o.status === "draft")!;
    await expect(career.getOpportunity(carlos, rh.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(career.applyToOpportunity(carlos, rh.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(career.getOpportunity(joao, draft.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const motorista = all.find((o) => o.title === "Motorista de Transporte")!;
    await getDb().update(internalOpportunities).set({ closesAt: new Date(Date.now() - 1000) }).where(eq(internalOpportunities.id, motorista.id));
    await expect(career.getOpportunity(carlos, motorista.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("faixas salariais não publicadas nunca aparecem", async () => {
    const plan = await career.careerPlan(carlos);
    expect(plan.positions.find((p) => p.title === "Gerente de Operações")?.band).toBeNull();
    expect(JSON.stringify(plan)).not.toContain("1200000");
  });
});

describe("feedbacks", () => {
  it("colaborador vê apenas os próprios feedbacks publicados; leitura auditada e confirmação idempotente", async () => {
    const list = await fb.listMyFeedbacks(carlos);
    const reconhecimento = list.find((f) => f.type === "reconhecimento")!;
    expect(reconhecimento.acknowledgedAt).toBeNull();
    const a = await fb.acknowledgeFeedback(carlos, reconhecimento.id);
    const b = await fb.acknowledgeFeedback(carlos, reconhecimento.id);
    expect(b.acknowledgedAt?.getTime()).toBe(a.acknowledgedAt?.getTime());
    const [draft] = await getDb().select().from(feedbacks).where(eq(feedbacks.status, "rascunho"));
    await expect(fb.getMyFeedback(carlos, draft.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("IDOR: feedback de outra pessoa é negado (serviço e API) e autor anônimo não é revelado", async () => {
    const [anaFb] = await fb.listMyFeedbacks(ana);
    expect(anaFb.authorLabel).toBe("Recursos Humanos");
    await expect(fb.getMyFeedback(carlos, anaFb.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(fb.acknowledgeFeedback(carlos, anaFb.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const res = await feedbackGet(apiRequest(`/api/v1/feedbacks/${anaFb.id}`, { cookie: await sessionCookie(people.carlos.user.id) }), params({ id: anaFb.id }));
    expect(res.status).toBe(404);
  });
});

describe("ajuda, perfil e notificações", () => {
  it("contagem de categorias, acesso anônimo e voto único por pessoa", async () => {
    const cats = await help.helpCategoriesWithCounts(carlos);
    expect(cats.find((c) => c.slug === "sistemas-e-acesso")?.articles).toBe(3);
    expect((await help.searchArticles(carlos, {})).length).toBe(11);
    const art = await help.getArticle(carlos, "esqueci-minha-senha");
    await help.registerArticleView(carlos, art.id);
    await help.voteArticle(carlos, art.id, true);
    await help.voteArticle(carlos, art.id, false);
    const after = await help.getArticle(carlos, "esqueci-minha-senha");
    expect(after).toMatchObject({ myVote: false, helpfulTotal: 1, helpfulYes: 0 });
    const [row] = await getDb().select().from(helpArticles).where(eq(helpArticles.id, art.id));
    expect(row.viewCount).toBe(1);
    await expect(help.getArticle(carlos, "artigo-rascunho")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("notificações: só as próprias; preferências respeitadas", async () => {
    const mine = await notif.listNotifications(carlos);
    await expect(notif.markRead(ana, mine.items[0].id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await notif.markRead(carlos, mine.items[0].id);
    await notif.setNotificationPreference(carlos, "cursos", false);
    await notif.notify([people.carlos.user.id, people.ana.user.id], { category: "cursos", title: "Novo curso" });
    const rows = await getDb().select().from(notifications).where(eq(notifications.title, "Novo curso"));
    expect(rows.map((r) => r.userId)).toEqual([people.ana.user.id]);
    await notif.setNotificationPreference(carlos, "conta", false);
    expect((await notif.getNotificationPreferences(carlos)).find((p) => p.category === "conta")?.inApp).toBe(true);
    await notif.markAllRead(carlos);
    expect(await notif.unreadCount(carlos)).toBe(0);
  });

  it("atalhos da Home: validação no servidor (1 a 4 itens conhecidos)", async () => {
    const cookie = await sessionCookie(people.carlos.user.id);
    const bad = await prefsPatch(apiRequest("/api/v1/me/preferences", { method: "PATCH", cookie, json: { homeShortcuts: ["comunicados", "admin"] } }), params({}));
    expect(bad.status).toBe(422);
    const tooMany = await prefsPatch(apiRequest("/api/v1/me/preferences", { method: "PATCH", cookie, json: { homeShortcuts: ["comunicados", "documentos", "cursos", "carreira", "ajuda"] } }), params({}));
    expect(tooMany.status).toBe(422);
    const ok = await prefsPatch(apiRequest("/api/v1/me/preferences", { method: "PATCH", cookie, json: { homeShortcuts: ["ajuda", "solicitacoes"] } }), params({}));
    expect(ok.status).toBe(200);
    expect((await profile.getPreferences(carlos)).homeShortcuts).toEqual(["ajuda", "solicitacoes"]);
  });

  it("sessões: lista as próprias e encerra outra sessão, nunca a atual", async () => {
    await sessionCookie(people.carlos.user.id);
    const list = await profile.mySessions(carlos);
    const other = list.find((s) => !s.current)!;
    const current = list.find((s) => s.current)!;
    await expect(profile.revokeMySession(carlos, current.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await profile.revokeMySession(carlos, other.id);
    expect((await profile.mySessions(carlos)).some((s) => s.id === other.id)).toBe(false);
    await expect(profile.revokeMySession(ana, current.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
