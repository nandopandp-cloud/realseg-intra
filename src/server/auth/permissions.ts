/**
 * Catálogo de permissões (fonte da verdade para seeds e checagens).
 * Formato: recurso:ação[:escopo]. "own" = apenas registros do próprio usuário.
 * Matriz documentada em docs/SECURITY.md.
 */
export const PERMISSIONS = {
  // Colaborador
  "profile:read:own": "Ver o próprio perfil",
  "profile:update:own": "Alterar preferências e senha da própria conta",
  "notification:read:own": "Ver e marcar as próprias notificações",
  "announcement:read": "Ler comunicados destinados ao seu público",
  "announcement:acknowledge": "Confirmar ciência de comunicados",
  "document:read:own": "Ver e baixar os próprios documentos",
  "document:acknowledge:own": "Confirmar ciência dos próprios documentos",
  "document:submit:own": "Enviar documentos ao RH",
  "policy:read": "Ler normas, manuais e regulamentos",
  "ticket:create": "Abrir solicitações",
  "ticket:read:own": "Ver as próprias solicitações (ou compartilhadas)",
  "ticket:comment:own": "Responder e anexar nas próprias solicitações",
  "course:read": "Ver catálogo de cursos elegíveis",
  "course:enroll": "Matricular-se e registrar progresso",
  "career:read": "Ver plano de carreira, cargos e faixas publicadas",
  "opportunity:read": "Ver oportunidades internas elegíveis",
  "opportunity:apply": "Candidatar-se a oportunidades internas",
  "feedback:read:own": "Ver os próprios feedbacks publicados",
  "feedback:acknowledge:own": "Confirmar leitura dos próprios feedbacks",
  "help:read": "Ler a central de ajuda",
  // Gestão (próxima fase — UI do RH/gestor)
  "employee:read:team": "Ver dados básicos da própria equipe",
  "feedback:write:team": "Registrar feedbacks para a própria equipe",
  "employee:read:any": "Ver dados de colaboradores",
  "employee:manage": "Gerenciar colaboradores, cargos e setores",
  "announcement:manage": "Criar, publicar e arquivar comunicados",
  "announcement:report": "Ver relatório de leitura e ciência",
  "document:manage": "Distribuir e gerenciar documentos",
  "document:read:any": "Ver documentos de qualquer colaborador",
  "submission:review": "Analisar documentos enviados",
  "ticket:read:any": "Ver fila de solicitações",
  "ticket:manage": "Atender, atribuir e alterar solicitações",
  "sla:configure": "Configurar categorias, calendários e SLA",
  "course:manage": "Gerenciar cursos e trilhas",
  "course:report": "Ver relatórios de capacitação",
  "career:manage": "Gerenciar cargos, faixas e oportunidades",
  "salary_band:read:any": "Ver todas as faixas salariais (inclusive não publicadas)",
  "feedback:write:any": "Registrar feedbacks para qualquer colaborador",
  "help:manage": "Gerenciar artigos da central de ajuda",
  "report:export": "Exportar relatórios",
  "audit:read": "Consultar trilha de auditoria",
  "role:manage": "Gerenciar papéis e permissões",
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ROLE_KEYS = ["COLABORADOR", "GESTOR", "RH", "ADMIN"] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

const COLABORADOR: Permission[] = [
  "profile:read:own",
  "profile:update:own",
  "notification:read:own",
  "announcement:read",
  "announcement:acknowledge",
  "document:read:own",
  "document:acknowledge:own",
  "document:submit:own",
  "policy:read",
  "ticket:create",
  "ticket:read:own",
  "ticket:comment:own",
  "course:read",
  "course:enroll",
  "career:read",
  "opportunity:read",
  "opportunity:apply",
  "feedback:read:own",
  "feedback:acknowledge:own",
  "help:read",
];

const GESTOR: Permission[] = ["employee:read:team", "feedback:write:team"];

const RH: Permission[] = [
  "employee:read:any",
  "employee:manage",
  "announcement:manage",
  "announcement:report",
  "document:manage",
  "document:read:any",
  "submission:review",
  "ticket:read:any",
  "ticket:manage",
  "course:manage",
  "course:report",
  "career:manage",
  "salary_band:read:any",
  "feedback:write:any",
  "help:manage",
  "report:export",
];

const ADMIN: Permission[] = ["sla:configure", "audit:read", "role:manage"];

/** Qualquer uma destas permissões dá acesso ao ambiente de gestão (/rh); cada tela exige a sua. */
export const MANAGEMENT_PERMISSIONS: Permission[] = [...RH, ...ADMIN];

/** Permissões padrão por papel (seed). Papéis são cumulativos: um RH também é COLABORADOR. */
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleKey, Permission[]> = {
  COLABORADOR,
  GESTOR,
  RH,
  ADMIN,
};

export const ROLE_LABELS: Record<RoleKey, string> = {
  COLABORADOR: "Colaborador",
  GESTOR: "Gestor",
  RH: "Recursos Humanos",
  ADMIN: "Administrador",
};
