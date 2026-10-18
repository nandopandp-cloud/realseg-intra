/**
 * Dados de DEMONSTRAÇÃO (ADR-0010) — nunca executar em produção.
 * Pessoas e conteúdos fictícios, identificados pelo domínio reservado @demo.realseg.invalid
 * e pelo carimbo "DOCUMENTO DE DEMONSTRAÇÃO" nos PDFs.
 */
import { eq, sql } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { hashPassword, shortCode } from "@/server/auth/crypto";
import { storeUpload } from "@/server/files/storage";
import { addBusinessMinutes, type BusinessCalendar } from "@/server/sla/business-time";
import { makeDemoPdf } from "./pdf";

/** Senha padrão só para ambientes locais; em homologação pública defina DEMO_PASSWORD (forte e secreta). */
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "Realseg@2026";
export const DEMO_DOMAIN = "demo.realseg.invalid";

type Ctx = { db: Database; now: Date };

/** Data relativa: `days` dias atrás às `hour`:`minute` (horário de Brasília, UTC-3). */
function ago(now: Date, days: number, hour = 9, minute = 0) {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour + 3, minute, 0, 0);
  return d;
}
function ahead(now: Date, days: number, hour = 9) {
  return ago(now, -days, hour);
}
/** Volta N dias úteis (seg–sex). */
function businessDaysAgo(now: Date, n: number, hour = 9) {
  const d = ago(now, 0, hour);
  let left = n;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() - 1);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return d;
}
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

async function pdf(ctx: Ctx, fileName: string, title: string, lines: string[], uploader: string | null) {
  const f = await storeUpload({ name: fileName.replace(/[\\/]/g, "-"), bytes: makeDemoPdf(title, lines) }, uploader, ctx.db);
  return f.id;
}

export async function seedDemo(db: Database, opts: { now?: Date } = {}) {
  const ctx: Ctx = { db, now: opts.now ?? new Date() };
  const { now } = ctx;
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  // ── Estrutura organizacional ───────────────────────────────────────────────
  const [dOps, dSeg, dAdm, dRh, dTi] = await db
    .insert(s.departments)
    .values([
      { code: "OPS", name: "Operações" },
      { code: "SEG", name: "Segurança Patrimonial" },
      { code: "ADM", name: "Administrativo" },
      { code: "RH", name: "Recursos Humanos" },
      { code: "TI", name: "Tecnologia da Informação" },
    ])
    .returning();
  const [uSp, uRj] = await db
    .insert(s.units)
    .values([
      { name: "Sede Administrativa", city: "São Paulo", state: "SP" },
      { name: "Unidade Rio de Janeiro", city: "Rio de Janeiro", state: "RJ" },
    ])
    .returning();
  const [fOps, fSeg, fAdm] = await db
    .insert(s.jobFamilies)
    .values([
      { name: "Operacional", description: "Logística, transporte e apoio operacional." },
      { name: "Segurança", description: "Vigilância e segurança patrimonial." },
      { name: "Administrativo", description: "Áreas de apoio e gestão." },
    ])
    .returning();
  const criteria = "Tempo mínimo de 12 meses no nível atual, trilha da família concluída e avaliação de desempenho igual ou superior a 'Atende'.";
  const [pOp1, pOp2, pOp3, pSup, pMot, pVig1, pVig2, pAnRh, pAnTi, pGer] = await db
    .insert(s.jobPositions)
    .values([
      { title: "Auxiliar Operacional", familyId: fOps.id, level: 1, levelLabel: "I", description: "Apoio às rotinas operacionais.", requirements: "Ensino médio completo.", progressionCriteria: criteria },
      { title: "Auxiliar Operacional", familyId: fOps.id, level: 2, levelLabel: "II", description: "Execução de rotinas operacionais com autonomia.", requirements: "Ensino médio completo e 1 ano na função.", progressionCriteria: criteria },
      { title: "Auxiliar Operacional", familyId: fOps.id, level: 3, levelLabel: "III", description: "Referência técnica da equipe operacional.", requirements: "Ensino médio completo e 2 anos na função.", progressionCriteria: criteria },
      { title: "Supervisor Operacional", familyId: fOps.id, level: 4, levelLabel: "Supervisão", description: "Coordenação de equipes e escalas.", requirements: "Experiência em liderança de equipes.", progressionCriteria: "Programa de liderança concluído e indicação da gestão." },
      { title: "Motorista de Transporte", familyId: fOps.id, level: 2, levelLabel: "II", description: "Transporte de valores e equipes.", requirements: "CNH categoria D e curso de condução defensiva." },
      { title: "Agente de Segurança Patrimonial", familyId: fSeg.id, level: 1, levelLabel: "I", description: "Vigilância patrimonial.", requirements: "Curso de formação de vigilante." },
      { title: "Agente de Segurança Patrimonial", familyId: fSeg.id, level: 2, levelLabel: "II", description: "Vigilância patrimonial com rondas e relatórios.", requirements: "Curso de formação de vigilante e 1 ano na função." },
      { title: "Analista de RH", familyId: fAdm.id, level: 2, levelLabel: "Pleno", description: "Rotinas de pessoal e atendimento." },
      { title: "Analista de TI", familyId: fAdm.id, level: 2, levelLabel: "Pleno", description: "Suporte e sistemas." },
      { title: "Gerente de Operações", familyId: fOps.id, level: 5, levelLabel: "Gerência", description: "Gestão da área de operações." },
    ])
    .returning();

  await db.insert(s.salaryBands).values([
    { jobPositionId: pOp1.id, minCents: 210000, maxCents: 260000, effectiveFrom: "2026-01-01", visibleToEmployees: true },
    { jobPositionId: pOp2.id, minCents: 260000, maxCents: 320000, effectiveFrom: "2026-01-01", visibleToEmployees: true },
    { jobPositionId: pOp3.id, minCents: 320000, maxCents: 390000, effectiveFrom: "2026-01-01", visibleToEmployees: true },
    { jobPositionId: pSup.id, minCents: 420000, maxCents: 560000, effectiveFrom: "2026-01-01", visibleToEmployees: true },
    // Faixa não publicada: nunca deve aparecer para colaboradores.
    { jobPositionId: pGer.id, minCents: 1200000, maxCents: 1600000, effectiveFrom: "2026-01-01", visibleToEmployees: false },
    { jobPositionId: pVig1.id, minCents: 230000, maxCents: 280000, effectiveFrom: "2026-01-01", visibleToEmployees: true },
    { jobPositionId: pVig2.id, minCents: 280000, maxCents: 340000, effectiveFrom: "2026-01-01", visibleToEmployees: true },
  ]);

  // ── Pessoas ────────────────────────────────────────────────────────────────
  const roles = Object.fromEntries((await db.select().from(s.roles)).map((r) => [r.key, r.id]));
  async function person(p: {
    email: string;
    fullName: string;
    preferredName?: string;
    registration: string;
    dept: string;
    unit: string;
    position: string;
    admission: string;
    roles: string[];
    manager?: string;
  }) {
    const [u] = await db.insert(s.users).values({ email: p.email, passwordHash, passwordChangedAt: now }).returning();
    const [e] = await db
      .insert(s.employees)
      .values({
        userId: u.id,
        fullName: p.fullName,
        preferredName: p.preferredName ?? null,
        registrationNumber: p.registration,
        departmentId: p.dept,
        unitId: p.unit,
        jobPositionId: p.position,
        admissionDate: p.admission,
        managerEmployeeId: p.manager ?? null,
      })
      .returning();
    await db.insert(s.userRoles).values(p.roles.map((r) => ({ userId: u.id, roleId: roles[r] })));
    return { user: u, employee: e };
  }

  const roberto = await person({ email: `roberto.lima@${DEMO_DOMAIN}`, fullName: "Roberto Lima", registration: "100045", dept: dOps.id, unit: uSp.id, position: pGer.id, admission: "2018-03-12", roles: ["COLABORADOR", "GESTOR"] });
  const carlos = await person({ email: `carlos.silva@${DEMO_DOMAIN}`, fullName: "Carlos Silva", registration: "100231", dept: dOps.id, unit: uSp.id, position: pOp2.id, admission: "2023-02-06", roles: ["COLABORADOR"], manager: roberto.employee.id });
  const ana = await person({ email: `ana.souza@${DEMO_DOMAIN}`, fullName: "Ana Souza", registration: "100198", dept: dSeg.id, unit: uRj.id, position: pVig2.id, admission: "2022-08-01", roles: ["COLABORADOR"] });
  const mariana = await person({ email: `mariana.costa@${DEMO_DOMAIN}`, fullName: "Mariana Costa", registration: "100012", dept: dRh.id, unit: uSp.id, position: pAnRh.id, admission: "2019-05-20", roles: ["COLABORADOR", "RH"] });
  const lucas = await person({ email: `lucas.martins@${DEMO_DOMAIN}`, fullName: "Lucas Martins", registration: "100077", dept: dTi.id, unit: uSp.id, position: pAnTi.id, admission: "2021-01-11", roles: ["COLABORADOR", "ADMIN"] });
  const joao = await person({ email: `joao.pereira@${DEMO_DOMAIN}`, fullName: "João Pereira", registration: "100402", dept: dAdm.id, unit: uSp.id, position: pOp1.id, admission: ago(now, 3).toISOString().slice(0, 10), roles: ["COLABORADOR"] });

  // ── Comunicados ────────────────────────────────────────────────────────────
  const annCats = Object.fromEntries((await db.select().from(s.announcementCategories)).map((c) => [c.slug, c.id]));
  const annDefs = [
    { key: "uniforme", cat: "operacoes", days: 9, important: true, ack: true, title: "Atualização no uso do uniforme", summary: "Confira as novas orientações sobre o uso do uniforme e equipamentos de identificação.", author: "Operações" },
    { key: "campanha", cat: "institucional", days: 12, title: "Campanha de prevenção e segurança", summary: "Dicas importantes para manter um ambiente de trabalho seguro.", author: "Comunicação Interna" },
    { key: "sipat", cat: "eventos", days: 15, title: "SIPAT 2026", summary: "Participe da Semana Interna de Prevenção de Acidentes do Trabalho.", author: "Segurança do Trabalho" },
    { key: "ponto", cat: "processos", days: 19, title: "Atualização no sistema de ponto", summary: "Veja o passo a passo para registrar sua jornada corretamente.", author: "Recursos Humanos" },
    { key: "beneficios", cat: "rh", days: 27, title: "Novo plano de benefícios", summary: "Conheça as novidades e como aderir aos novos benefícios da empresa.", author: "Recursos Humanos" },
    { key: "resultados", cat: "resultados", days: 32, title: "Resultados do programa de segurança", summary: "Veja os principais indicadores e conquistas do último trimestre.", author: "Diretoria" },
    { key: "destaque", cat: "institucional", days: 4, featured: true, title: "Nossa gente faz a diferença", summary: "Segurança é resultado de pessoas comprometidas.", author: "Comunicação Interna" },
    { key: "feriado", cat: "rh", days: 11, important: true, title: "Horário especial no feriado de 12 de outubro", summary: "Confira a escala e o funcionamento das unidades no feriado.", author: "Recursos Humanos" },
    { key: "lgpd", cat: "institucional", days: 40, important: true, ack: true, title: "Atualização da política de privacidade (LGPD)", summary: "Entenda como a REALSEG trata seus dados pessoais.", author: "Jurídico" },
    { key: "brigada", cat: "eventos", days: 45, title: "Inscrições abertas para a Brigada de Incêndio", summary: "Faça parte da brigada da sua unidade. Vagas limitadas.", author: "Segurança do Trabalho" },
    { key: "vacinacao", cat: "rh", days: 50, title: "Campanha de vacinação 2026", summary: "Vacinação gratuita contra a gripe nas unidades.", author: "Recursos Humanos" },
    { key: "canal", cat: "institucional", days: 60, title: "Novo canal de atendimento ao colaborador", summary: "Agora você pode abrir solicitações e acompanhar prazos pela intranet.", author: "Comunicação Interna" },
    // Segmentado para outra unidade — Carlos não deve ver.
    { key: "rj-only", cat: "operacoes", days: 6, title: "Mudança de escala na Unidade Rio de Janeiro", summary: "Nova escala de revezamento a partir do próximo mês.", author: "Operações", unit: uRj.id },
  ];
  const anns: Record<string, string> = {};
  for (const a of annDefs) {
    const [row] = await db
      .insert(s.announcements)
      .values({
        categoryId: annCats[a.cat],
        title: a.title,
        summary: a.summary,
        body: announcementBody(a.key, a.summary),
        isImportant: a.important ?? false,
        requiresAck: a.ack ?? false,
        isFeatured: a.featured ?? false,
        status: "published",
        publishedAt: ago(now, a.days, 10),
        authorUserId: mariana.user.id,
        authorLabel: a.author,
      })
      .returning();
    anns[a.key] = row.id;
    await db.insert(s.announcementAudiences).values(a.unit ? { announcementId: row.id, type: "unit", refId: a.unit } : { announcementId: row.id, type: "all" });
  }
  // Rascunho e agendado: não aparecem para colaboradores.
  for (const status of ["draft", "scheduled"] as const) {
    const [row] = await db
      .insert(s.announcements)
      .values({
        categoryId: annCats.institucional,
        title: status === "draft" ? "Rascunho: confraternização de fim de ano" : "Agendado: resultados do 4º trimestre",
        summary: "Conteúdo ainda não publicado.",
        body: "Conteúdo ainda não publicado.",
        status,
        publishAt: status === "scheduled" ? ahead(now, 10) : null,
        authorUserId: mariana.user.id,
        authorLabel: "Comunicação Interna",
      })
      .returning();
    await db.insert(s.announcementAudiences).values({ announcementId: row.id, type: "all" });
  }
  const attach = await pdf(ctx, "orientacoes-uniforme.pdf", "Orientações de uso do uniforme", ["Uso obrigatório do crachá visível.", "Camisa polo REALSEG em serviço externo.", "Calçado de segurança nas áreas operacionais."], mariana.user.id);
  await db.insert(s.announcementAttachments).values({ announcementId: anns.uniforme, fileId: attach });

  // Carlos: 3 não lidos (uniforme, campanha, sipat), 1 favorito (sipat), LGPD com ciência.
  const readKeys = ["ponto", "beneficios", "resultados", "destaque", "feriado", "lgpd", "brigada", "vacinacao", "canal"];
  await db.insert(s.announcementReads).values(readKeys.map((k, i) => ({ announcementId: anns[k], userId: carlos.user.id, version: 1, readAt: ago(now, 3 + i) })));
  await db.insert(s.announcementAcknowledgements).values({ announcementId: anns.lgpd, userId: carlos.user.id, version: 1, acknowledgedAt: ago(now, 38) });
  await db.insert(s.announcementFavorites).values({ announcementId: anns.sipat, userId: carlos.user.id });

  await db.insert(s.events).values([
    { title: "SIPAT 2026", description: "Semana Interna de Prevenção de Acidentes do Trabalho", location: "Todas as unidades", startsAt: ahead(now, 3), announcementId: anns.sipat },
    { title: "Treinamento de Brigada", description: "Turma 2 - Sede Administrativa", location: "Sede Administrativa", startsAt: ahead(now, 8), unitId: uSp.id, announcementId: anns.brigada },
    { title: "Campanha de Vacinação", description: "Unidade Rio de Janeiro", location: "Unidade Rio de Janeiro", startsAt: ahead(now, 22), announcementId: anns.vacinacao },
    { title: "Evento encerrado", description: "Não deve aparecer em próximos eventos", startsAt: ago(now, 20) },
  ]);

  // ── Documentos ─────────────────────────────────────────────────────────────
  const docCats = Object.fromEntries((await db.select().from(s.documentCategories)).map((c) => [c.slug, c.id]));
  async function personalDoc(
    owner: { employee: { id: string }; user: { id: string } },
    cat: string,
    title: string,
    receivedDaysAgo: number,
    opts: { period?: string; requiresAck?: boolean; lines?: string[] } = {},
  ) {
    const fileId = await pdf(ctx, `${title}.pdf`, title, opts.lines ?? [`Colaborador: registro de demonstração`, `Referência: ${opts.period ?? "-"}`], mariana.user.id);
    const [doc] = await db
      .insert(s.documents)
      .values({
        categoryId: docCats[cat],
        scope: "personal",
        ownerEmployeeId: owner.employee.id,
        title,
        referencePeriod: opts.period ?? null,
        requiresAck: opts.requiresAck ?? false,
        createdByUserId: mariana.user.id,
        createdAt: ago(now, receivedDaysAgo, 8),
      })
      .returning();
    const [v] = await db.insert(s.documentVersions).values({ documentId: doc.id, versionNumber: 1, fileId, createdByUserId: mariana.user.id, createdAt: doc.createdAt }).returning();
    await db.update(s.documents).set({ currentVersionId: v.id }).where(eq(s.documents.id, doc.id));
    return { doc, version: v };
  }

  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro"];
  const holerites = [];
  for (let i = 0; i < months.length; i++) {
    holerites.push(await personalDoc(carlos, "holerite", `Holerite - ${months[i]}/2026`, 17 + (8 - i) * 30, { period: `2026-${String(i + 1).padStart(2, "0")}` }));
  }
  await personalDoc(carlos, "comprovante-rendimentos", "Comprovante de Rendimentos 2025", 216, { period: "2025" });
  await personalDoc(carlos, "comunicado-individual", "Aviso de Férias", 221);
  await personalDoc(carlos, "feedback", "Feedback de Desempenho", 254);
  await personalDoc(carlos, "administrativo", "Carta de Advertência", 278, { requiresAck: true });
  await personalDoc(carlos, "comunicado-individual", "Comunicado Interno - Mudança de Horário", 282, { requiresAck: true });
  const declaracao = await personalDoc(carlos, "administrativo", "Declaração de Trabalho", 57);
  // Ciência registrada no comunicado de mudança de horário? Não: permanece pendente para demonstrar "exige ação".
  await db.insert(s.auditEvents).values({ action: "document.downloaded", actorUserId: carlos.user.id, entityType: "document", entityId: declaracao.doc.id, createdAt: ago(now, 50) });

  // Documento de outra pessoa (testes de IDOR)
  await personalDoc(ana, "holerite", "Holerite - Setembro/2026", 17, { period: "2026-09" });

  async function policyDoc(cat: string, title: string, description: string, requiresAck = false, updatedDaysAgo = 90) {
    const fileId = await pdf(ctx, `${title}.pdf`, title, [description], mariana.user.id);
    const [doc] = await db
      .insert(s.documents)
      .values({ categoryId: docCats[cat], scope: "institutional", title, description, requiresAck, effectiveFrom: "2026-01-01", createdByUserId: mariana.user.id, createdAt: ago(now, 90) })
      .returning();
    const [v] = await db.insert(s.documentVersions).values({ documentId: doc.id, versionNumber: 1, fileId, createdByUserId: mariana.user.id, createdAt: ago(now, updatedDaysAgo) }).returning();
    await db.update(s.documents).set({ currentVersionId: v.id }).where(eq(s.documents.id, doc.id));
    return doc;
  }
  await policyDoc("normas-procedimentos", "Normas e procedimentos", "Políticas e regulamentos internos");
  await policyDoc("manual-vestimentas", "Manual de vestimentas", "Uso de uniformes e EPIs", true, 33);
  await policyDoc("manual-ponto", "Manual de ponto eletrônico", "Orientações de registro de ponto");
  await policyDoc("regulamentos-internos", "Regulamentos internos", "Diretrizes e condutas da empresa");

  async function submission(owner: typeof carlos, cat: string, title: string, days: number, status: s.SubmissionStatus, note?: string) {
    const fileId = await pdf(ctx, `${title}.pdf`, title, ["Arquivo enviado pelo colaborador (demonstração)."], owner.user.id);
    const [sub] = await db
      .insert(s.documentSubmissions)
      .values({
        employeeId: owner.employee.id,
        categoryId: docCats[cat],
        title,
        fileId,
        status,
        referenceDate: isoDate(ago(now, days + 1)),
        reviewerUserId: status === "aceito" || status === "recusado" ? mariana.user.id : null,
        reviewNote: note ?? null,
        reviewedAt: status === "aceito" || status === "recusado" ? ago(now, days - 1, 14) : null,
        createdAt: ago(now, days, 11),
      })
      .returning();
    await db.insert(s.documentSubmissionEvents).values({ submissionId: sub.id, toStatus: "enviado", actorUserId: owner.user.id, createdAt: ago(now, days, 11) });
    if (status !== "enviado") {
      await db.insert(s.documentSubmissionEvents).values({ submissionId: sub.id, fromStatus: "enviado", toStatus: "em_analise", actorUserId: mariana.user.id, createdAt: ago(now, days, 15) });
    }
    if (status === "aceito" || status === "recusado") {
      await db.insert(s.documentSubmissionEvents).values({ submissionId: sub.id, fromStatus: "em_analise", toStatus: status, actorUserId: mariana.user.id, note: note ?? null, createdAt: ago(now, days - 1, 14) });
    }
    return sub;
  }
  await submission(carlos, "atestado-medico", "Atestado médico - consulta", 20, "aceito");
  await submission(carlos, "comprovante", "Comprovante de residência", 9, "recusado", "Imagem ilegível. Envie uma nova foto com o documento inteiro.");
  await submission(carlos, "declaracao", "Declaração escolar", 2, "em_analise");
  await submission(ana, "atestado-medico", "Atestado médico", 5, "enviado");

  // ── Solicitações ───────────────────────────────────────────────────────────
  const tCats = Object.fromEntries((await db.select().from(s.ticketCategories)).map((c) => [c.slug, c]));
  const [calRow] = await db.select().from(s.slaCalendars).limit(1);
  const holidays = await db.select().from(s.slaHolidays).where(eq(s.slaHolidays.calendarId, calRow.id));
  const cal: BusinessCalendar = { timezone: calRow.timezone, workingHours: calRow.workingHours, holidays: new Set(holidays.map((h) => h.date)) };
  const policies = await db.select().from(s.slaPolicies);

  async function ticket(t: {
    number: number;
    owner: typeof carlos;
    cat: string;
    subject: string;
    description: string;
    status: s.TicketStatus;
    createdAt: Date;
    priority?: s.TicketPriority;
    respondAfterMin?: number;
    pauseAfterMin?: number;
    resolveAfterDays?: number;
    agentMessages?: string[];
  }) {
    const cat = tCats[t.cat];
    const priority = t.priority ?? "normal";
    const policy = policies.find((p) => p.categoryId === cat.id && p.priority === priority)!;
    const firstResponseDueAt = addBusinessMinutes(t.createdAt, policy.firstResponseMinutes, cal);
    const resolutionDueAt = addBusinessMinutes(t.createdAt, policy.resolutionMinutes, cal);
    const firstRespondedAt = t.respondAfterMin != null ? addBusinessMinutes(t.createdAt, t.respondAfterMin, cal) : null;
    const done = t.status === "fechado" || t.status === "resolvido";
    const resolvedAt = done ? new Date(t.createdAt.getTime() + (t.resolveAfterDays ?? 1) * 86400_000) : null;
    const pausedAt = t.pauseAfterMin != null ? addBusinessMinutes(t.createdAt, t.pauseAfterMin, cal) : null;
    const [row] = await db
      .insert(s.tickets)
      .values({
        number: t.number,
        requesterEmployeeId: t.owner.employee.id,
        categoryId: cat.id,
        subject: t.subject,
        description: t.description,
        priority,
        status: t.status,
        assigneeUserId: t.status === "aberto" ? null : mariana.user.id,
        slaPolicyId: policy.id,
        firstResponseDueAt,
        resolutionDueAt,
        firstRespondedAt,
        resolvedAt,
        closedAt: t.status === "fechado" ? resolvedAt : null,
        pausedAt,
        createdAt: t.createdAt,
        updatedAt: t.createdAt,
      })
      .returning();
    await db.insert(s.ticketEvents).values({ ticketId: row.id, type: "created", toValue: "aberto", actorUserId: t.owner.user.id, createdAt: t.createdAt });
    let cursor = t.createdAt;
    for (const [i, body] of (t.agentMessages ?? []).entries()) {
      cursor = i === 0 && firstRespondedAt ? firstRespondedAt : new Date(cursor.getTime() + 3600_000);
      await db.insert(s.ticketMessages).values({ ticketId: row.id, authorUserId: mariana.user.id, body, createdAt: cursor });
    }
    if (t.status !== "aberto") {
      await db.insert(s.ticketEvents).values({ ticketId: row.id, type: "assigned", toValue: "Mariana Costa", actorUserId: mariana.user.id, createdAt: firstRespondedAt ?? t.createdAt });
      await db.insert(s.ticketEvents).values({ ticketId: row.id, type: "status_changed", fromValue: "aberto", toValue: done ? "resolvido" : t.status, actorUserId: mariana.user.id, createdAt: pausedAt ?? firstRespondedAt ?? t.createdAt });
    }
    if (pausedAt) await db.insert(s.ticketEvents).values({ ticketId: row.id, type: "sla_paused", actorUserId: mariana.user.id, createdAt: pausedAt });
    if (t.status === "fechado") await db.insert(s.ticketEvents).values({ ticketId: row.id, type: "status_changed", fromValue: "resolvido", toValue: "fechado", createdAt: resolvedAt! });
    return row;
  }

  await ticket({ number: 1048, owner: carlos, cat: "rh", subject: "Atualização cadastral", description: "Preciso atualizar meu endereço e telefone de contato no cadastro.", status: "em_andamento", createdAt: businessDaysAgo(now, 1, 9), respondAfterMin: 90, agentMessages: ["Olá, Carlos! Recebemos sua solicitação e já estamos atualizando seu cadastro. Avisaremos quando concluir."] });
  await ticket({ number: 1042, owner: carlos, cat: "ti", subject: "Acesso ao sistema", description: "Não consigo acessar o sistema de escalas com minha senha.", status: "respondido", createdAt: businessDaysAgo(now, 1, 14), respondAfterMin: 45, agentMessages: ["Seu acesso foi redefinido. Tente entrar novamente e, se funcionar, confirme que o problema foi resolvido."] });
  await ticket({ number: 1036, owner: carlos, cat: "facilities", subject: "Manutenção do ar-condicionado", description: "O ar-condicionado da sala de operações está pingando.", status: "aguardando_colaborador", createdAt: businessDaysAgo(now, 3, 10), respondAfterMin: 120, pauseAfterMin: 180, agentMessages: ["Para agendarmos a visita técnica, informe o andar e o número da sala, por favor."] });
  await ticket({ number: 1029, owner: carlos, cat: "rh", subject: "Solicitação de holerite", description: "Preciso da segunda via do holerite de agosto.", status: "fechado", createdAt: ago(now, 27, 9), respondAfterMin: 60, resolveAfterDays: 1, agentMessages: ["O holerite foi disponibilizado em Documentos."] });
  await ticket({ number: 1021, owner: carlos, cat: "servicos", subject: "Troca de crachá", description: "Meu crachá está com a foto desatualizada.", status: "fechado", createdAt: ago(now, 32, 9), respondAfterMin: 120, resolveAfterDays: 2, agentMessages: ["Novo crachá disponível na recepção."] });
  await ticket({ number: 1008, owner: carlos, cat: "ti", subject: "Instalação de software", description: "Solicito instalação do leitor de PDF no computador da portaria.", status: "fechado", createdAt: ago(now, 37, 9), respondAfterMin: 30, resolveAfterDays: 1, agentMessages: ["Instalação concluída."] });
  await ticket({ number: 985, owner: carlos, cat: "facilities", subject: "Limpeza da área comum", description: "A copa do 2º andar precisa de limpeza extra.", status: "fechado", createdAt: ago(now, 44, 9), respondAfterMin: 60, resolveAfterDays: 1, agentMessages: ["Limpeza realizada."] });
  await ticket({ number: 972, owner: carlos, cat: "rh", subject: "Dúvida sobre benefícios", description: "Gostaria de saber como incluir dependente no plano de saúde.", status: "fechado", createdAt: ago(now, 50, 9), respondAfterMin: 60, resolveAfterDays: 2, agentMessages: ["Enviamos o passo a passo por mensagem. Qualquer dúvida, estamos à disposição."] });
  await ticket({ number: 1050, owner: ana, cat: "rh", subject: "Alteração de conta bancária", description: "Solicito alteração da conta para recebimento de salário.", status: "aberto", createdAt: businessDaysAgo(now, 0, 9) });
  await db.execute(sql`select setval('ticket_number_seq', (select max(number) from tickets))`);
  await db.insert(s.ticketDrafts).values({ employeeId: carlos.employee.id, categoryId: tCats.servicos.id, subject: "Troca de cadeira", description: "A cadeira da minha estação está quebrada." });

  // ── Cursos ─────────────────────────────────────────────────────────────────
  const cCats = Object.fromEntries((await db.select().from(s.courseCategories)).map((c) => [c.slug, c.id]));
  async function course(c: { slug: string; title: string; cat: string; cover: string; lessons: number; minutes: number; mandatory?: boolean; cert?: boolean; summary: string; audience?: { type: s.AudienceType; refId: string } }) {
    const [row] = await db
      .insert(s.courses)
      .values({
        slug: c.slug,
        title: c.title,
        summary: c.summary,
        description: `${c.summary}\n\nEste é um curso de demonstração: as aulas trazem textos de exemplo para validar a navegação, o progresso e a emissão de certificados.`,
        categoryId: cCats[c.cat],
        coverImage: c.cover,
        isMandatory: c.mandatory ?? false,
        mandatoryDueDays: c.mandatory ? 30 : null,
        issuesCertificate: c.cert ?? true,
        status: "published",
        publishedAt: ago(now, 120),
      })
      .returning();
    await db.insert(s.courseAudiences).values(c.audience ? { courseId: row.id, ...c.audience } : { courseId: row.id, type: "all" });
    const perModule = Math.ceil(c.lessons / 2);
    const lessonIds: string[] = [];
    for (let m = 0; m < 2 && m * perModule < c.lessons; m++) {
      const [mod] = await db.insert(s.courseModules).values({ courseId: row.id, title: m === 0 ? "Fundamentos" : "Aplicação no dia a dia", position: m + 1 }).returning();
      for (let l = m * perModule; l < Math.min(c.lessons, (m + 1) * perModule); l++) {
        const [les] = await db
          .insert(s.lessons)
          .values({
            moduleId: mod.id,
            title: `Aula ${l + 1}: ${lessonTitle(c.slug, l)}`,
            type: "texto",
            content: lessonContent(c.title, l),
            durationMinutes: Math.round(c.minutes / c.lessons),
            position: l - m * perModule + 1,
          })
          .returning();
        lessonIds.push(les.id);
      }
    }
    return { ...row, lessonIds };
  }

  const cBoas = await course({ slug: "boas-praticas-de-seguranca", title: "Boas práticas de segurança no ambiente de trabalho", cat: "seguranca", cover: "/images/thumb-continue-m.jpg", lessons: 5, minutes: 75, summary: "Hábitos e cuidados que previnem acidentes no dia a dia." });
  const cNr33 = await course({ slug: "nr-33-espacos-confinados", title: "NR 33 - Espaços Confinados", cat: "seguranca", cover: "/images/thumb-nr33.jpg", lessons: 8, minutes: 150, mandatory: true, summary: "Requisitos da norma regulamentadora para trabalho em espaços confinados." });
  const cIncendio = await course({ slug: "prevencao-e-combate-a-incendios", title: "Prevenção e combate a incêndios", cat: "seguranca", cover: "/images/thumb-incendio.jpg", lessons: 6, minutes: 105, summary: "Classes de incêndio, extintores e plano de abandono." });
  const cConducao = await course({ slug: "conducao-defensiva", title: "Condução defensiva", cat: "operacional", cover: "/images/thumb-conducao.jpg", lessons: 10, minutes: 200, summary: "Técnicas para dirigir com segurança e evitar acidentes." });
  const cComEquipe = await course({ slug: "comunicacao-e-trabalho-em-equipe", title: "Comunicação e trabalho em equipe", cat: "lideranca", cover: "/images/thumb-equipe.jpg", lessons: 8, minutes: 120, summary: "Como se comunicar com clareza e colaborar melhor." });
  const cLider = await course({ slug: "lideranca-na-pratica", title: "Liderança na prática", cat: "lideranca", cover: "/images/thumb-lideranca.jpg", lessons: 8, minutes: 150, summary: "Fundamentos de liderança para quem coordena equipes." });
  const cCultura = await course({ slug: "cultura-de-seguranca", title: "Cultura de segurança", cat: "seguranca", cover: "/images/thumb-cultura.jpg", lessons: 5, minutes: 80, summary: "Como cada pessoa contribui para uma cultura de segurança." });
  const cComEficaz = await course({ slug: "comunicacao-eficaz-em-equipe", title: "Comunicação eficaz em equipe", cat: "desenvolvimento-pessoal", cover: "/images/thumb-comunicacao.jpg", lessons: 6, minutes: 105, summary: "Escuta ativa, feedback e alinhamento." });
  const cIntegracao = await course({ slug: "integracao-realseg", title: "Integração REALSEG", cat: "compliance", cover: "/images/course-continue.jpg", lessons: 4, minutes: 60, mandatory: true, summary: "Conheça a empresa, nossos valores e políticas." });
  const cLgpd = await course({ slug: "lgpd-no-dia-a-dia", title: "LGPD no dia a dia", cat: "compliance", cover: "/images/thumb-cultura.jpg", lessons: 4, minutes: 60, summary: "Cuidados com dados pessoais de colegas e clientes." });
  const cAtend = await course({ slug: "atendimento-ao-cliente", title: "Atendimento ao cliente", cat: "qualidade", cover: "/images/thumb-equipe.jpg", lessons: 4, minutes: 60, summary: "Postura e comunicação no atendimento." });
  await course({ slug: "gestao-administrativa", title: "Rotinas administrativas", cat: "qualidade", cover: "/images/hero-documentos.jpg", lessons: 4, minutes: 60, summary: "Curso exclusivo da área administrativa.", audience: { type: "department", refId: dAdm.id } });

  async function enroll(user: { id: string }, c: { id: string; lessonIds: string[] }, done: number, opts: { days: number; source?: "self" | "assigned" } ) {
    const total = c.lessonIds.length;
    const completed = done >= total;
    const [en] = await db
      .insert(s.enrollments)
      .values({
        courseId: c.id,
        userId: user.id,
        source: opts.source ?? "self",
        status: completed ? "concluido" : "em_andamento",
        progressPercent: Math.round((done / total) * 100),
        lastLessonId: c.lessonIds[Math.min(done, total - 1)],
        enrolledAt: ago(now, opts.days),
        updatedAt: ago(now, Math.max(0, opts.days - done)),
        completedAt: completed ? ago(now, opts.days - 5) : null,
        dueAt: opts.source === "assigned" ? ahead(now, 12) : null,
      })
      .returning();
    if (done > 0) await db.insert(s.lessonProgress).values(c.lessonIds.slice(0, done).map((lessonId, i) => ({ enrollmentId: en.id, lessonId, completedAt: ago(now, opts.days - i) })));
    if (completed) await db.insert(s.certificates).values({ enrollmentId: en.id, code: shortCode(10), issuedAt: ago(now, opts.days - 5) });
    return en;
  }
  await enroll(carlos.user, cIntegracao, 4, { days: 200, source: "assigned" });
  await enroll(carlos.user, cLgpd, 4, { days: 90 });
  await enroll(carlos.user, cAtend, 4, { days: 66 });
  await enroll(carlos.user, cBoas, 3, { days: 4 });
  await enroll(carlos.user, cIncendio, 1, { days: 9 });
  await enroll(carlos.user, cNr33, 0, { days: 4, source: "assigned" });
  await enroll(ana.user, cBoas, 2, { days: 8 });

  const [lpSeg, lpOps, lpLid] = await db
    .insert(s.learningPaths)
    .values([
      { slug: "seguranca-no-trabalho", title: "Segurança no trabalho", description: "Formação essencial em segurança.", color: "blue", icon: "shield-check", position: 1 },
      { slug: "operacional", title: "Operacional", description: "Trilha da família profissional Operacional.", color: "teal", icon: "truck", position: 2, jobFamilyId: fOps.id },
      { slug: "desenvolvimento-de-lideres", title: "Desenvolvimento de líderes", description: "Preparação para posições de liderança.", color: "purple", icon: "users", position: 3 },
    ])
    .returning();
  await db.insert(s.learningPathCourses).values([
    ...[cBoas, cNr33, cIncendio, cCultura, cIntegracao].map((c, i) => ({ pathId: lpSeg.id, courseId: c.id, position: i + 1 })),
    ...[cIntegracao, cLgpd, cAtend, cBoas, cConducao].map((c, i) => ({ pathId: lpOps.id, courseId: c.id, position: i + 1 })),
    ...[cComEquipe, cLider, cComEficaz, cCultura, cAtend, cLgpd].map((c, i) => ({ pathId: lpLid.id, courseId: c.id, position: i + 1 })),
  ]);

  // ── Carreira ───────────────────────────────────────────────────────────────
  await db.insert(s.developmentGoals).values([
    { employeeId: carlos.employee.id, title: "Concluir curso NR 33", dueDate: isoDate(ahead(now, 3)), status: "em_andamento", courseId: cNr33.id, position: 1, createdByUserId: roberto.user.id },
    { employeeId: carlos.employee.id, title: "Realizar avaliação da trilha", dueDate: isoDate(ahead(now, 13)), status: "pendente", position: 2, createdByUserId: roberto.user.id },
    { employeeId: carlos.employee.id, title: "Participar do programa de liderança", startsOn: isoDate(ahead(now, 20)), status: "pendente", position: 3, createdByUserId: roberto.user.id },
    { employeeId: carlos.employee.id, title: "Concluir a Integração REALSEG", status: "concluida", completedAt: ago(now, 195), position: 0, createdByUserId: roberto.user.id },
  ]);
  await db.insert(s.achievements).values([
    { employeeId: carlos.employee.id, kind: "auto", code: "first_course_completed", title: "Primeiro curso concluído", description: "Integração REALSEG", icon: "star", color: "teal", awardedAt: ago(now, 195) },
    { employeeId: carlos.employee.id, kind: "manual", code: "trilha-operacional-50", title: "Trilha operacional", description: "Metade da trilha concluída", icon: "shield-check", color: "teal", awardedAt: ago(now, 42) },
    { employeeId: carlos.employee.id, kind: "manual", code: "destaque-mes-2026-09", title: "Destaque do mês", description: "Reconhecimento da liderança", icon: "trophy", color: "amber", awardedAt: ago(now, 46) },
  ]);
  const [oMot, oAgente, oRh] = await db
    .insert(s.internalOpportunities)
    .values([
      { title: "Motorista de Transporte", jobPositionId: pMot.id, unitId: uRj.id, areaLabel: "Operacional", description: "Transporte de equipes e materiais entre unidades, seguindo rotas e protocolos de segurança.", requirements: "CNH categoria D, curso de condução defensiva e disponibilidade para escalas.", status: "published", publishedAt: ago(now, 2), closesAt: ahead(now, 20), createdByUserId: mariana.user.id },
      { title: "Agente de Segurança Patrimonial", jobPositionId: pVig1.id, unitId: uSp.id, areaLabel: "Segurança", description: "Rondas, controle de acesso e elaboração de relatórios de ocorrência.", requirements: "Curso de formação de vigilante válido.", status: "published", isHighlighted: true, publishedAt: ago(now, 12), closesAt: ahead(now, 15), createdByUserId: mariana.user.id },
      { title: "Assistente de RH", jobPositionId: pAnRh.id, unitId: uSp.id, areaLabel: "Administrativo", description: "Apoio às rotinas de departamento pessoal.", requirements: "Ensino superior em andamento.", status: "published", publishedAt: ago(now, 5), closesAt: ahead(now, 25), createdByUserId: mariana.user.id },
    ])
    .returning();
  await db.insert(s.opportunityEligibility).values({ opportunityId: oRh.id, type: "department", refId: dAdm.id });
  await db.insert(s.internalOpportunities).values({ title: "Vaga em rascunho", areaLabel: "Operacional", description: "Não publicada", requirements: "-", status: "draft" });
  void oMot;
  void oAgente;

  // ── Feedbacks ──────────────────────────────────────────────────────────────
  await db.insert(s.feedbacks).values([
    { employeeId: carlos.employee.id, authorUserId: roberto.user.id, authorContext: "Gestor imediato", type: "avaliacao", title: "Avaliação semestral", cycle: "Ciclo 2026.1", body: "Carlos demonstrou comprometimento com os procedimentos de segurança e boa comunicação com a equipe.\n\nPontos de desenvolvimento: organização das escalas e registro das ocorrências no prazo.\n\nPróximos passos: concluir a NR 33 e participar do programa de liderança.", status: "publicado", publishedAt: ago(now, 30), acknowledgedAt: ago(now, 29) },
    { employeeId: carlos.employee.id, authorUserId: roberto.user.id, authorContext: "Gestor imediato", type: "reconhecimento", title: "Destaque do mês", cycle: "Setembro/2026", body: "Reconhecimento pela atuação durante a auditoria de segurança da Sede Administrativa.", status: "publicado", publishedAt: ago(now, 6) },
    { employeeId: carlos.employee.id, authorUserId: roberto.user.id, authorContext: "Gestor imediato", type: "feedback", title: "Rascunho — não publicado", body: "Rascunho.", status: "rascunho" },
    { employeeId: ana.employee.id, authorUserId: mariana.user.id, showAuthor: false, authorContext: "Recursos Humanos", type: "feedback", title: "Feedback de acompanhamento", body: "Conteúdo restrito à colaboradora.", status: "publicado", publishedAt: ago(now, 10) },
  ]);

  // ── Ajuda (conteúdo institucional de exemplo) ─────────────────────────────
  const hCats = Object.fromEntries((await db.select().from(s.helpCategories)).map((c) => [c.slug, c.id]));
  await db.insert(s.helpArticles).values([
    { slug: "como-registrar-o-ponto", categoryId: hCats["recursos-humanos"], type: "tutorial", icon: "clock", color: "teal", title: "Como registrar o ponto", summary: "Aprenda a registrar sua jornada de trabalho corretamente.", body: "Conteúdo de demonstração.\n\n- Registre a entrada ao chegar ao posto.\n- Registre intervalo e retorno.\n- Em caso de falha, abra uma solicitação para o RH.", status: "published", publishedAt: ago(now, 60), viewCount: 340, relatedTicketCategoryId: tCats.rh.id },
    { slug: "politica-de-uso-do-uniforme", categoryId: hCats.seguranca, type: "artigo", icon: "shield-check", color: "blue", title: "Política de uso do uniforme", summary: "Regras e orientações sobre o uso do uniforme da REALSEG.", body: "Conteúdo de demonstração.\n\nO uniforme deve estar limpo e completo durante toda a jornada. O crachá deve ficar visível.", status: "published", publishedAt: ago(now, 30), viewCount: 512 },
    { slug: "solicitacao-de-ferias", categoryId: hCats["recursos-humanos"], type: "faq", icon: "users", color: "purple", title: "Solicitação de férias", summary: "Como solicitar, prazos e documentação necessária.", body: "Conteúdo de demonstração.\n\nAs férias devem ser solicitadas com 30 dias de antecedência por meio de uma solicitação ao RH.", status: "published", publishedAt: ago(now, 45), viewCount: 290, relatedTicketCategoryId: tCats.rh.id },
    { slug: "manual-do-colaborador", categoryId: hCats.documentos, type: "artigo", icon: "file-text", color: "blue", title: "Manual do colaborador", summary: "Informações importantes sobre a empresa, benefícios e conduta.", body: "Conteúdo de demonstração.\n\nConsulte o manual completo em Documentos › Normas e manuais.", status: "published", publishedAt: ago(now, 90), viewCount: 420 },
    { slug: "rotina-de-transportadoras", categoryId: hCats.operacoes, type: "artigo", icon: "truck", color: "amber", title: "Rotina de recebimento de transportadoras", summary: "Procedimento de conferência e registro de cargas.", body: "Conteúdo de demonstração.", status: "published", publishedAt: ago(now, 15), viewCount: 75 },
    { slug: "rede-wifi-corporativa", categoryId: hCats.infraestrutura, type: "tutorial", icon: "laptop", color: "indigo", title: "Conectar à rede Wi-Fi corporativa", summary: "Passo a passo para conectar notebooks e celulares.", body: "Conteúdo de demonstração.", status: "published", publishedAt: ago(now, 20), viewCount: 130, relatedTicketCategoryId: tCats.ti.id },
    { slug: "artigo-rascunho", categoryId: hCats.operacoes, type: "artigo", title: "Rascunho de artigo", summary: "Não publicado", body: "-", status: "draft" },
  ]);

  // ── Notificações ───────────────────────────────────────────────────────────
  await db.insert(s.notifications).values([
    { userId: carlos.user.id, category: "comunicados", title: "Novo comunicado importante", body: "Atualização no uso do uniforme", link: `/comunicados/${anns.uniforme}`, entityType: "announcement", entityId: anns.uniforme, createdAt: ago(now, 9, 10) },
    { userId: carlos.user.id, category: "documentos", title: "Novo documento disponível", body: "Holerite - Setembro/2026", link: "/documentos", createdAt: ago(now, 17, 8) },
    { userId: carlos.user.id, category: "solicitacoes", title: "Solicitação #1042 respondida", body: "A equipe de TI respondeu sua solicitação.", link: "/solicitacoes/1042", createdAt: businessDaysAgo(now, 1, 15) },
    { userId: carlos.user.id, category: "solicitacoes", title: "Solicitação #1036 aguarda sua resposta", body: "Precisamos de uma informação para continuar.", link: "/solicitacoes/1036", createdAt: businessDaysAgo(now, 3, 13) },
    { userId: carlos.user.id, category: "cursos", title: "Curso obrigatório atribuído", body: "NR 33 - Espaços Confinados", link: `/cursos/${cNr33.slug}`, createdAt: ago(now, 4), readAt: ago(now, 3) },
  ]);

  return { carlos, ana, mariana, roberto, lucas, joao };
}

function announcementBody(key: string, summary: string) {
  if (key === "uniforme") {
    return [
      "A partir de **1º de novembro**, entram em vigor as novas orientações sobre o uso do uniforme e dos equipamentos de identificação.",
      "## O que muda",
      "- O crachá deve permanecer visível durante toda a jornada.",
      "- A camisa polo REALSEG passa a ser obrigatória em serviços externos.",
      "- Calçados de segurança são obrigatórios nas áreas operacionais.",
      "## Precisa de um uniforme novo?",
      "Abra uma solicitação para **Serviços** informando o tamanho desejado.",
      "Este comunicado exige **confirmação de ciência**. Confirmar ciência indica que você leu as orientações.",
    ].join("\n\n");
  }
  return `${summary}\n\nEste é um comunicado de demonstração criado para validar a experiência da intranet.\n\n- Leia com atenção.\n- Em caso de dúvidas, abra uma solicitação para o RH.`;
}

function lessonTitle(slug: string, index: number) {
  const titles = ["Introdução", "Conceitos principais", "Riscos e cuidados", "Procedimentos", "Boas práticas", "Estudo de caso", "Revisão", "Avaliação final", "Situações reais", "Encerramento"];
  return titles[index % titles.length];
}

function lessonContent(course: string, index: number) {
  return [
    `Conteúdo de demonstração do curso **${course}** — aula ${index + 1}.`,
    "## Objetivos",
    "- Compreender os conceitos apresentados.",
    "- Relacionar o conteúdo com a sua rotina.",
    "## Resumo",
    "Leia o texto com calma. Ao final, toque em **Concluir aula** para registrar seu progresso.",
  ].join("\n\n");
}
