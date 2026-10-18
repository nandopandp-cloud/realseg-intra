/**
 * Dados de REFERÊNCIA (configuração), aplicáveis a qualquer ambiente e idempotentes.
 * Não contém pessoas nem conteúdo fictício. Valores de SLA são a configuração INICIAL proposta
 * e devem ser validados pelo RH (ver docs/REQUIREMENTS.md §SLA).
 */
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, ROLE_KEYS, ROLE_LABELS } from "@/server/auth/permissions";

const NATIONAL_HOLIDAYS: Array<[string, string]> = [
  ["2026-01-01", "Confraternização Universal"],
  ["2026-04-03", "Sexta-feira Santa"],
  ["2026-04-21", "Tiradentes"],
  ["2026-05-01", "Dia do Trabalho"],
  ["2026-09-07", "Independência do Brasil"],
  ["2026-10-12", "Nossa Senhora Aparecida"],
  ["2026-11-02", "Finados"],
  ["2026-11-15", "Proclamação da República"],
  ["2026-11-20", "Dia Nacional de Zumbi e da Consciência Negra"],
  ["2026-12-25", "Natal"],
  ["2027-01-01", "Confraternização Universal"],
  ["2027-03-26", "Sexta-feira Santa"],
  ["2027-04-21", "Tiradentes"],
  ["2027-05-01", "Dia do Trabalho"],
  ["2027-09-07", "Independência do Brasil"],
  ["2027-10-12", "Nossa Senhora Aparecida"],
  ["2027-11-02", "Finados"],
  ["2027-11-15", "Proclamação da República"],
  ["2027-11-20", "Dia Nacional de Zumbi e da Consciência Negra"],
  ["2027-12-25", "Natal"],
];

/** Minutos úteis (expediente de 10h/dia). */
const SLA_MATRIX: Record<string, Record<"baixa" | "normal" | "alta" | "urgente", [number, number]>> = {
  rh: { baixa: [480, 3000], normal: [240, 1800], alta: [120, 600], urgente: [60, 240] },
  ti: { baixa: [240, 1800], normal: [120, 600], alta: [60, 300], urgente: [30, 120] },
  servicos: { baixa: [480, 3000], normal: [240, 1800], alta: [120, 600], urgente: [60, 240] },
  facilities: { baixa: [480, 4800], normal: [240, 3000], alta: [120, 1200], urgente: [60, 300] },
};

export async function seedReference(db: Database) {
  // Papéis e permissões
  await db
    .insert(s.permissions)
    .values(Object.entries(PERMISSIONS).map(([key, description]) => ({ key, description })))
    .onConflictDoUpdate({ target: s.permissions.key, set: { description: sql`excluded.description` } });
  for (const key of ROLE_KEYS) {
    const [role] = await db
      .insert(s.roles)
      .values({ key, name: ROLE_LABELS[key] })
      .onConflictDoUpdate({ target: s.roles.key, set: { name: ROLE_LABELS[key] } })
      .returning();
    // Acrescenta permissões padrão ausentes sem remover ajustes feitos pela administração.
    await db
      .insert(s.rolePermissions)
      .values(DEFAULT_ROLE_PERMISSIONS[key].map((permissionKey) => ({ roleId: role.id, permissionKey })))
      .onConflictDoNothing();
  }

  await db
    .insert(s.announcementCategories)
    .values([
      { slug: "institucional", name: "Institucional", color: "blue", icon: "file-text" },
      { slug: "eventos", name: "Eventos", color: "amber", icon: "calendar-days" },
      { slug: "processos", name: "Processos", color: "purple", icon: "settings" },
      { slug: "rh", name: "RH", color: "teal", icon: "users" },
      { slug: "resultados", name: "Resultados", color: "red", icon: "chart-column" },
      { slug: "operacoes", name: "Operações", color: "teal", icon: "megaphone" },
      { slug: "seguranca", name: "Segurança", color: "blue", icon: "shield-check" },
    ])
    .onConflictDoNothing();

  await db
    .insert(s.documentCategories)
    .values([
      { slug: "holerite", name: "Holerite", kind: "personal", color: "indigo", icon: "file-text", sensitive: true, position: 1, description: "Demonstrativos de pagamento mensais." },
      { slug: "comprovante-rendimentos", name: "Comprovante", kind: "personal", color: "blue", icon: "file-text", sensitive: true, position: 2, description: "Comprovantes de rendimentos para declaração de IR." },
      { slug: "comunicado-individual", name: "Comunicado", kind: "personal", color: "teal", icon: "file-text", position: 3, description: "Avisos individuais (férias, mudança de horário etc.)." },
      { slug: "feedback", name: "Feedback", kind: "personal", color: "orange", icon: "file-text", sensitive: true, position: 4, description: "Registros formais de desempenho." },
      { slug: "administrativo", name: "Administrativo", kind: "personal", color: "purple", icon: "file-text", sensitive: true, position: 5, description: "Declarações, advertências e documentos administrativos." },
      { slug: "normas-procedimentos", name: "Normas e procedimentos", kind: "institutional", color: "slate", icon: "book-open", position: 10, description: "Políticas e regulamentos internos." },
      { slug: "manual-vestimentas", name: "Manual de vestimentas", kind: "institutional", color: "slate", icon: "shirt", position: 11, description: "Uso de uniformes e EPIs." },
      { slug: "manual-ponto", name: "Manual de ponto eletrônico", kind: "institutional", color: "slate", icon: "clock", position: 12, description: "Orientações de registro de ponto." },
      { slug: "regulamentos-internos", name: "Regulamentos internos", kind: "institutional", color: "slate", icon: "file-text", position: 13, description: "Diretrizes e condutas da empresa." },
      { slug: "atestado-medico", name: "Atestado médico", kind: "submission", color: "red", icon: "stethoscope", sensitive: true, position: 20, description: "Atestados e declarações médicas." },
      { slug: "declaracao", name: "Declaração", kind: "submission", color: "blue", icon: "file-check", position: 21, description: "Declarações escolares, de comparecimento e similares." },
      { slug: "comprovante", name: "Comprovante", kind: "submission", color: "teal", icon: "receipt", position: 22, description: "Comprovantes de residência, escolaridade etc." },
      { slug: "outros", name: "Outros", kind: "submission", color: "slate", icon: "file", position: 23, description: "Outros documentos solicitados pelo RH." },
    ])
    .onConflictDoNothing();

  await db
    .insert(s.ticketCategories)
    .values([
      { slug: "rh", name: "RH", description: "Dados, benefícios e documentos", color: "teal", icon: "user-round", position: 1 },
      { slug: "ti", name: "TI", description: "Sistemas e acessos", color: "blue", icon: "laptop", position: 2 },
      { slug: "servicos", name: "Serviços", description: "Infraestrutura e equipamentos", color: "indigo", icon: "settings", position: 3 },
      { slug: "facilities", name: "Facilities", description: "Manutenção e estrutura", color: "slate", icon: "building-2", position: 4 },
    ])
    .onConflictDoNothing();

  // Calendário de atendimento + feriados nacionais (estaduais/municipais: configurar pelo RH)
  const [calendar] = await db
    .insert(s.slaCalendars)
    .values({
      name: "Atendimento padrão",
      timezone: "America/Sao_Paulo",
      workingHours: {
        "1": [["08:00", "18:00"]],
        "2": [["08:00", "18:00"]],
        "3": [["08:00", "18:00"]],
        "4": [["08:00", "18:00"]],
        "5": [["08:00", "18:00"]],
      },
    })
    .onConflictDoUpdate({ target: s.slaCalendars.name, set: { updatedAt: new Date() } })
    .returning();
  await db
    .insert(s.slaHolidays)
    .values(NATIONAL_HOLIDAYS.map(([date, name]) => ({ calendarId: calendar.id, date, name })))
    .onConflictDoNothing();

  const categories = await db.select().from(s.ticketCategories);
  for (const cat of categories) {
    const matrix = SLA_MATRIX[cat.slug];
    if (!matrix) continue;
    for (const [priority, [first, resolution]] of Object.entries(matrix) as Array<[keyof typeof matrix, [number, number]]>) {
      const existing = await db
        .select({ id: s.slaPolicies.id })
        .from(s.slaPolicies)
        .where(and(eq(s.slaPolicies.categoryId, cat.id), eq(s.slaPolicies.priority, priority), isNull(s.slaPolicies.supersededAt)));
      if (existing.length) continue;
      await db.insert(s.slaPolicies).values({ categoryId: cat.id, priority, calendarId: calendar.id, firstResponseMinutes: first, resolutionMinutes: resolution });
    }
  }

  await db
    .insert(s.courseCategories)
    .values([
      { slug: "seguranca", name: "Segurança", color: "teal", icon: "shield-check", position: 1 },
      { slug: "operacional", name: "Operacional", color: "amber", icon: "truck", position: 2 },
      { slug: "lideranca", name: "Liderança", color: "purple", icon: "users", position: 3 },
      { slug: "qualidade", name: "Qualidade", color: "blue", icon: "badge-check", position: 4 },
      { slug: "compliance", name: "Compliance", color: "slate", icon: "file-text", position: 5 },
      { slug: "desenvolvimento-pessoal", name: "Desenvolvimento pessoal", color: "indigo", icon: "chart-column", position: 6 },
    ])
    .onConflictDoNothing();

  await db
    .insert(s.helpCategories)
    .values([
      { slug: "sistemas-e-acesso", name: "Sistemas e acesso", description: "Login, permissões, uso das plataformas", color: "teal", icon: "settings", position: 1 },
      { slug: "seguranca", name: "Segurança", description: "Procedimentos, políticas e boas práticas", color: "blue", icon: "shield-check", position: 2 },
      { slug: "documentos", name: "Documentos", description: "Formulários, manuais e políticas internas", color: "blue", icon: "file-text", position: 3 },
      { slug: "recursos-humanos", name: "Recursos Humanos", description: "Benefícios, ponto e documentos", color: "purple", icon: "users", position: 4 },
      { slug: "operacoes", name: "Operações", description: "Rotinas, veículos e transportadoras", color: "amber", icon: "truck", position: 5 },
      { slug: "infraestrutura", name: "Infraestrutura", description: "Equipamentos, rede e suporte técnico", color: "indigo", icon: "laptop", position: 6 },
    ])
    .onConflictDoNothing();

  await seedProductHelpArticles(db);
}

/** Artigos sobre o uso da própria intranet (documentação real do produto, não dados fictícios). */
async function seedProductHelpArticles(db: Database) {
  const cats = Object.fromEntries((await db.select().from(s.helpCategories)).map((c) => [c.slug, c.id]));
  const tickets = Object.fromEntries((await db.select().from(s.ticketCategories)).map((c) => [c.slug, c.id]));
  const now = new Date();
  const articles = [
    {
      slug: "como-acessar-a-intranet-pela-primeira-vez",
      categoryId: cats["sistemas-e-acesso"],
      type: "tutorial" as const,
      icon: "file-text",
      color: "blue",
      title: "Como acessar a intranet pela primeira vez",
      summary: "Passo a passo para realizar seu primeiro acesso na plataforma.",
      relatedTicketCategoryId: tickets.ti,
      body: [
        "Seu acesso é criado pelo RH. Você recebe por e-mail um link para definir sua senha.",
        "## Passo a passo",
        "- Abra o link recebido e crie uma senha com pelo menos 10 caracteres, usando letras e números.",
        "- Na tela de entrada, informe seu e-mail corporativo **ou** sua matrícula e a senha criada.",
        "- Pronto: a página Início mostra seus atalhos, comunicados e solicitações.",
        "## Não recebeu o e-mail?",
        "Use a opção **Esqueci minha senha** na tela de entrada ou procure o RH da sua unidade.",
      ].join("\n\n"),
    },
    {
      slug: "esqueci-minha-senha",
      categoryId: cats["sistemas-e-acesso"],
      type: "faq" as const,
      icon: "lock",
      color: "slate",
      title: "Esqueci minha senha. E agora?",
      summary: "Veja como redefinir sua senha de forma rápida e segura.",
      relatedTicketCategoryId: tickets.ti,
      body: [
        "Na tela de entrada, toque em **Esqueci minha senha** e informe seu e-mail corporativo.",
        "Se o e-mail estiver cadastrado, você receberá um link válido por 30 minutos. O link só pode ser usado uma vez.",
        "Depois de criar a nova senha, todas as sessões abertas em outros aparelhos são encerradas por segurança.",
        "Por segurança, após 5 tentativas erradas o acesso fica bloqueado por 15 minutos.",
      ].join("\n\n"),
    },
    {
      slug: "como-abrir-uma-solicitacao",
      categoryId: cats["sistemas-e-acesso"],
      type: "tutorial" as const,
      icon: "headphones",
      color: "teal",
      title: "Como abrir e acompanhar uma solicitação",
      summary: "Abra chamados para RH, TI, Serviços e Facilities e acompanhe o prazo.",
      relatedTicketCategoryId: tickets.rh,
      body: [
        "Acesse **Solicitações** e toque em **Nova solicitação**.",
        "- Escolha a categoria (RH, TI, Serviços ou Facilities).",
        "- Escreva um assunto curto e descreva o que precisa. Se ajudar, anexe fotos ou PDF.",
        "- Confirme o envio. Você recebe um número de protocolo (ex.: #1050).",
        "## Prazos",
        "O prazo previsto é calculado em dias úteis, conforme a categoria e a prioridade. Quando a equipe pede uma informação sua, o prazo fica pausado até você responder.",
      ].join("\n\n"),
    },
    {
      slug: "como-enviar-um-atestado",
      categoryId: cats.documentos,
      type: "tutorial" as const,
      icon: "upload",
      color: "teal",
      title: "Como enviar um atestado ou documento ao RH",
      summary: "Envie atestados e declarações pelo celular em poucos passos.",
      relatedTicketCategoryId: tickets.rh,
      body: [
        "Acesse **Documentos › Enviar documento**.",
        "- Escolha o tipo de documento.",
        "- Tire uma foto ou selecione um arquivo PDF, JPG ou PNG de até 10 MB.",
        "- Confira os dados e confirme o envio.",
        "Você acompanha a análise em **Documentos › Histórico**: Enviado, Em análise, Aceito ou Recusado (com o motivo).",
      ].join("\n\n"),
    },
    {
      slug: "ciencia-de-documentos-e-comunicados",
      categoryId: cats.documentos,
      type: "faq" as const,
      icon: "file-check",
      color: "blue",
      title: "O que significa confirmar ciência?",
      summary: "Entenda a diferença entre visualizar, confirmar leitura e concordar.",
      relatedTicketCategoryId: null,
      body: [
        "Alguns comunicados e documentos pedem **confirmação de ciência**.",
        "Abrir ou baixar um arquivo **não** confirma ciência automaticamente: você precisa tocar no botão de confirmação.",
        "Confirmar ciência significa apenas que você leu o conteúdo — não significa que você concorda com ele.",
      ].join("\n\n"),
    },
  ];
  await db
    .insert(s.helpArticles)
    .values(articles.map((a) => ({ ...a, status: "published" as const, publishedAt: now })))
    .onConflictDoNothing();
}
