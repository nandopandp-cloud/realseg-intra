import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/server/db/client";
import { enrollments, notifications, units } from "@/server/db/schema";
import * as courses from "@/server/services/courses";
import * as rh from "@/server/services/rh/courses";
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
const input = (patch: Partial<rh.CourseInput> = {}): rh.CourseInput => ({
  title: "Direção defensiva",
  slug: "direcao-defensiva",
  summary: "Técnicas para dirigir com segurança.",
  description: "Curso prático de direção defensiva.",
  categorySlug: "seguranca",
  coverImage: null,
  isMandatory: true,
  mandatoryDueDays: 30,
  issuesCertificate: true,
  audience: ALL,
  ...patch,
});
const lesson = (title: string, patch: Partial<rh.LessonInput> = {}): rh.LessonInput => ({ title, type: "texto", content: "Conteúdo.", videoUrl: null, durationMinutes: 10, ...patch });

describe("vídeo", () => {
  it("normaliza links do YouTube e Vimeo para os players permitidos; recusa outros", () => {
    expect(rh.normalizeVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(rh.normalizeVideoUrl("https://youtu.be/dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(rh.normalizeVideoUrl("https://vimeo.com/123456")).toBe("https://player.vimeo.com/video/123456");
    expect(rh.normalizeVideoUrl("https://example.com/video.mp4")).toBeNull();
    expect(rh.normalizeVideoUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("curso", () => {
  it("rascunho não aparece; publicar exige aula; publicado aparece para o público", async () => {
    const { id } = await rh.createCourse(mariana, input());
    expect((await courses.listCourses(carlos)).some((c) => c.id === id)).toBe(false);
    await expect(rh.setCourseStatus(mariana, id, "published")).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    const c = await rh.getCourseAdmin(mariana, id);
    await rh.addLesson(mariana, c.modules[0].id, lesson("Introdução"));
    await rh.addLesson(mariana, c.modules[0].id, lesson("Vídeo", { type: "video", content: "", videoUrl: "https://youtu.be/dQw4w9WgXcQ" }));
    await rh.setCourseStatus(mariana, id, "published");
    const listed = (await courses.listCourses(carlos)).find((x) => x.id === id);
    expect(listed).toMatchObject({ lessonCount: 2, durationMinutes: 20, isMandatory: true });
    await expect(rh.createCourse(mariana, input({ title: "Outro" }))).rejects.toMatchObject({ details: { slug: expect.any(Array) } });
    await expect(rh.addLesson(mariana, c.modules[0].id, lesson("Vídeo ruim", { type: "video", content: "", videoUrl: "https://example.com/x" }))).rejects.toMatchObject({ details: { videoUrl: expect.any(Array) } });
  });

  it("reordena módulos e aulas sem violar a ordem única", async () => {
    const { id } = await rh.createCourse(mariana, input());
    const m1 = (await rh.getCourseAdmin(mariana, id)).modules[0].id;
    const m2 = (await rh.addModule(mariana, id, "Módulo 2")).id;
    const a = await rh.addLesson(mariana, m1, lesson("A"));
    await rh.addLesson(mariana, m1, lesson("B"));
    await rh.addLesson(mariana, m1, lesson("C"));
    await rh.moveLesson(mariana, a.id, 1);
    await rh.moveModule(mariana, m2, -1);
    const c = await rh.getCourseAdmin(mariana, id);
    expect(c.modules.map((m) => m.title)).toEqual(["Módulo 2", "Módulo 1"]);
    expect(c.modules[1].lessons.map((l) => l.title)).toEqual(["B", "A", "C"]);
    await rh.deleteLesson(mariana, c.modules[1].lessons[0].id);
    expect((await rh.getCourseAdmin(mariana, id)).modules[1].lessons.map((l) => [l.title, l.position])).toEqual([
      ["A", 1],
      ["C", 2],
    ]);
  });

  it("nova aula recalcula o progresso; aula já concluída não pode ser excluída", async () => {
    const { id } = await rh.createCourse(mariana, input());
    const m = (await rh.getCourseAdmin(mariana, id)).modules[0].id;
    const l1 = await rh.addLesson(mariana, m, lesson("Aula 1"));
    await rh.addLesson(mariana, m, lesson("Aula 2"));
    await rh.setCourseStatus(mariana, id, "published");
    await courses.completeLesson(carlos, l1.id);
    const prog = async () => (await getDb().select().from(enrollments).where(and(eq(enrollments.courseId, id), eq(enrollments.userId, people.carlos.user.id))))[0].progressPercent;
    expect(await prog()).toBe(50);
    await rh.addLesson(mariana, m, lesson("Aula 3"));
    expect(await prog()).toBe(33);
    await expect(rh.deleteLesson(mariana, l1.id)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    await expect(rh.deleteModule(mariana, m)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  });

  it("atribuição ao público com prazo, sem duplicar, e relatório com atrasados", async () => {
    const [rj] = await getDb().select().from(units).where(eq(units.name, "Unidade Rio de Janeiro"));
    const { id } = await rh.createCourse(mariana, input({ audience: { all: false, department: [], unit: [rj.id], job_position: [], job_family: [] } }));
    const m = (await rh.getCourseAdmin(mariana, id)).modules[0].id;
    await rh.addLesson(mariana, m, lesson("Aula"));
    await expect(rh.assignCourse(mariana, id, { target: "audience", dueDays: 10 })).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    await rh.setCourseStatus(mariana, id, "published");
    expect(await rh.assignCourse(mariana, id, { target: "audience", dueDays: 10 })).toEqual({ created: 1, updated: 0 });
    expect(await rh.assignCourse(mariana, id, { target: "audience", dueDays: 5 })).toEqual({ created: 0, updated: 1 });
    expect((await getDb().select().from(notifications).where(eq(notifications.entityId, id))).map((n) => n.userId)).toEqual([people.ana.user.id]);
    expect((await courses.listCourses(ana)).some((c) => c.id === id)).toBe(true);
    await getDb().update(enrollments).set({ dueAt: new Date(Date.now() - 86400_000) }).where(eq(enrollments.courseId, id));
    const r = await rh.courseReport(mariana, id);
    expect(r.totals).toMatchObject({ people: 1, inProgress: 1, overdue: 1 });
    expect((await rh.courseReport(mariana, id, { filter: "atrasados" })).items.map((i) => i.name)).toEqual(["Ana Souza"]);
  });

  it("trilha com cursos ordenados aparece para o colaborador", async () => {
    const { id } = await rh.createCourse(mariana, input());
    const m = (await rh.getCourseAdmin(mariana, id)).modules[0].id;
    await rh.addLesson(mariana, m, lesson("Aula"));
    await rh.setCourseStatus(mariana, id, "published");
    const p = await rh.savePath(mariana, null, { title: "Motoristas", description: "Trilha para motoristas.", color: "blue", icon: "truck", jobFamilyId: null, courseIds: [id] });
    const paths = await courses.listLearningPaths(carlos);
    expect(paths.some((x) => x.id === p.id)).toBe(true);
    await expect(rh.savePath(carlos, null, { title: "X", description: "", color: "blue", icon: "x", jobFamilyId: null, courseIds: [] })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
