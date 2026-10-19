import { beforeAll, describe, expect, it } from "vitest";
import * as ann from "@/server/services/announcements";
import * as docs from "@/server/services/documents";
import * as tk from "@/server/services/tickets";
import * as courses from "@/server/services/courses";
import * as career from "@/server/services/career";
import * as fb from "@/server/services/feedbacks";
import * as help from "@/server/services/help";
import { globalSearch } from "@/server/services/search";
import { homeData } from "@/server/services/home";
import type { Ctx } from "@/server/auth/actor";
import { ctxFor, resetDatabase, type People } from "../support/db";

let people: People;
let carlos: Ctx;
let joao: Ctx;

beforeAll(async () => {
  people = await resetDatabase();
  carlos = await ctxFor(people.carlos.user);
  joao = await ctxFor(people.joao.user);
});

describe("leituras do colaborador (dados de demonstração)", () => {
  it("comunicados: contagens por aba e segmentação por unidade", async () => {
    const r = await ann.listAnnouncements(carlos, { pageSize: 50 });
    expect(r.counts).toEqual({ todos: 14, importantes: 3, naoLidos: 3, favoritos: 1 });
    expect(r.items.map((i) => i.title)).not.toContain("Mudança de escala na Unidade Rio de Janeiro");
    expect(r.items.some((i) => i.title.startsWith("Rascunho") || i.title.startsWith("Agendado"))).toBe(false);
    const unread = await ann.listAnnouncements(carlos, { tab: "nao-lidos" });
    expect(unread.items.map((i) => i.title).sort()).toEqual(["Atualização no uso do uniforme", "Campanha de prevenção e segurança", "SIPAT 2026"]);
    const search = await ann.listAnnouncements(carlos, { q: "uniforme" });
    expect(search.total).toBe(1);
    const highlight = await ann.highlightedAnnouncement(carlos);
    expect(highlight?.title).toBe("Atualização no uso do uniforme");
    expect((await ann.upcomingEvents(carlos)).map((e) => e.title)).toEqual(["SIPAT 2026", "Treinamento de Brigada", "Campanha de Vacinação"]);
    expect((await ann.featuredAnnouncement(carlos))?.title).toBe("Nossa gente faz a diferença");
  });

  it("documentos: lista paginada, filtros, normas e histórico", async () => {
    const all = await docs.listMyDocuments(carlos, { pageSize: 50 });
    expect(all.total).toBe(15);
    const hol = await docs.listMyDocuments(carlos, { category: "holerite" });
    expect(hol.total).toBe(9);
    expect((await docs.listMyDocuments(carlos, { status: "pendente" })).total).toBe(2);
    expect((await docs.listMyDocuments(carlos, { q: "ferias" })).items[0]?.title).toBe("Aviso de Férias");
    expect((await docs.listPolicies(carlos)).length).toBe(4);
    expect(await docs.pendingDocumentAcks(carlos)).toEqual({ personal: 2, policies: 1 });
    const history = await docs.documentHistory(carlos);
    expect(history.length).toBeGreaterThan(5);
    expect((await docs.listMySubmissions(carlos)).length).toBe(3);
    expect((await docs.myDocumentYears(carlos))[0]).toBeGreaterThanOrEqual(2025);
  });

  it("solicitações: abas, SLA calculado a partir da política", async () => {
    const r = await tk.listMyTickets(carlos);
    expect(r.counts).toEqual({ todos: 8, andamento: 1, aguardando: 1, respondidos: 1, concluidos: 5 });
    const t = await tk.getMyTicket(carlos, 1048);
    expect(t.sla.kind).toBe("running");
    expect(t.messages.length).toBe(1);
    expect(t.actions.canReply).toBe(true);
    const paused = await tk.getMyTicket(carlos, 1036);
    expect(paused.sla.kind).toBe("paused");
    expect((await tk.listDrafts(carlos)).length).toBe(1);
    expect(await tk.awaitingMeCount(carlos)).toBe(2);
    const hours = await tk.supportHours(new Date("2026-10-14T15:00:00Z"));
    expect(hours).toMatchObject({ label: "Segunda a sexta", hours: "08h às 18h", online: true });
    // Ordem: abertas primeiro, depois pelo número (mais recente primeiro).
    expect(r.items.slice(0, 3).map((i) => i.number)).toEqual([1048, 1042, 1036]);
    // Período de abertura: só as abertas nos últimos 30 dias.
    const recent = await tk.listMyTickets(carlos, { periodDays: 30 });
    expect(recent.items.map((i) => i.number)).toEqual(expect.arrayContaining([1048, 1042, 1036, 1029]));
    expect(recent.items.map((i) => i.number)).not.toContain(972);
    // Prazos padrão por área, em linguagem simples.
    const slas = await tk.categorySlaSummary();
    expect(slas.map((s) => s.slug)).toEqual(["rh", "ti", "servicos", "facilities"]);
    expect(slas.find((s) => s.slug === "ti")).toMatchObject({ firstResponse: "2h úteis", resolution: "1 dia útil" });
  });

  it("cursos: elegibilidade, progresso e trilhas", async () => {
    const list = await courses.listCourses(carlos);
    expect(list.find((c) => c.slug === "gestao-administrativa")).toBeUndefined();
    expect(list.length).toBe(11);
    const summary = await courses.myLearningSummary(carlos);
    expect(summary).toMatchObject({ concluidos: 3, emAndamento: 3, naoIniciados: 5 });
    const cont = await courses.continueLearning(carlos);
    expect(cont).not.toBeNull();
    const paths = await courses.listLearningPaths(carlos);
    expect(paths.map((p) => p.title)).toEqual(["Segurança no trabalho", "Operacional", "Desenvolvimento de líderes"]);
    const c = await courses.getCourse(carlos, "boas-praticas-de-seguranca");
    expect(c.lessons.filter((l) => l.completed).length).toBe(3);
    expect((await courses.listMyCertificates(carlos)).length).toBe(3);
    // João (Administrativo) enxerga o curso restrito ao seu setor
    expect((await courses.listCourses(joao)).some((x) => x.slug === "gestao-administrativa")).toBe(true);
  });

  it("carreira: plano com faixas publicadas apenas, oportunidades elegíveis", async () => {
    const plan = await career.careerPlan(carlos);
    expect(plan.family.name).toBe("Operacional");
    expect(plan.positions.find((p) => p.isCurrent)?.levelLabel).toBe("II");
    const gerente = plan.positions.find((p) => p.title === "Gerente de Operações");
    expect(gerente?.band).toBeNull();
    // Faixas publicadas aparecem (regressão: a subconsulta comparava com a coluna errada e nunca encontrava faixa).
    expect(plan.positions.find((p) => p.isCurrent)?.band).toMatchObject({ minCents: 260000, maxCents: 320000 });
    const opps = await career.listOpportunities(carlos);
    expect(opps.map((o) => o.title)).toEqual(["Agente de Segurança Patrimonial", "Motorista de Transporte"]);
    expect((await career.listOpportunities(joao)).map((o) => o.title)).toContain("Assistente de RH");
    const ov = await career.careerOverview(carlos);
    expect(ov.track?.title).toBe("Operacional");
    expect(ov.track?.next).toMatchObject({ slug: "boas-praticas-de-seguranca", started: true });
    expect(ov.goals.length).toBe(4);
  });

  it("feedbacks: só publicados do próprio colaborador", async () => {
    const list = await fb.listMyFeedbacks(carlos);
    expect(list.map((f) => f.title).sort()).toEqual(["Avaliação semestral", "Destaque do mês"]);
  });

  it("ajuda, busca global e home", async () => {
    expect((await help.helpCategoriesWithCounts(carlos)).length).toBe(6);
    expect((await help.searchArticles(carlos, { q: "senha" }))[0]?.slug).toBe("esqueci-minha-senha");
    // Sugestões por palavras-chave (assunto livre), ignorando palavras comuns.
    expect((await help.suggestArticles(carlos, "Esqueci a senha do sistema de escalas"))[0]?.slug).toBe("esqueci-minha-senha");
    expect(await help.suggestArticles(carlos, "como para que")).toEqual([]);
    const art = await help.getArticle(carlos, "como-registrar-o-ponto");
    expect(art.relatedTicket?.slug).toBe("rh");
    const results = await globalSearch(carlos, "holerite");
    expect(results.some((r) => r.group === "Documentos")).toBe(true);
    expect(results.some((r) => r.group === "Solicitações")).toBe(true);
    const home = await homeData(carlos);
    expect(home.highlight?.title).toBe("Atualização no uso do uniforme");
    expect(home.tickets.length).toBe(3);
    expect(home.pending.map((p) => p.key)).toEqual(["docs", "ann", "tickets", "courses", "feedbacks"]);
    expect(home.badges).toMatchObject({ comunicados: "1 pendente", documentos: "3 pendentes", cursos: "1 obrigatório", solicitacoes: "2 aguardam você" });
    expect(home.docs.map((d) => [d.title, d.kind])).toEqual([
      ["Holerite - Setembro/2026", "recebido"],
      ["Manual de vestimentas", "atualizado"],
      ["Holerite - Agosto/2026", "recebido"],
    ]);
    const empty = await homeData(joao);
    expect(empty.tickets).toEqual([]);
    // Sem documentos pessoais: só aparecem normas/manuais atualizados recentemente (visíveis a todos).
    expect(empty.docs.every((d) => d.kind === "atualizado")).toBe(true);
  });
});
