import {
  BookOpenText,
  CalendarDays,
  ChartColumn,
  FileText,
  GraduationCap,
  Headphones,
  LayoutDashboard,
  Megaphone,
  MessageSquareHeart,
  Network,
  ScrollText,
  Settings2,
  UsersRound,
} from "lucide-react";
import type { Permission } from "@/server/auth/permissions";
import type { NavItem } from "./nav-items";

export type RhNavItem = NavItem & { permission: Permission | null; pending?: true };
export type RhNavGroup = { label: string; items: RhNavItem[] };

const starts = (prefix: string) => (p: string) => p === prefix || p.startsWith(`${prefix}/`);

/** Menu do ambiente de gestão. Cada item só aparece para quem tem a permissão (a página também a exige). */
export const RH_NAV: RhNavGroup[] = [
  {
    label: "Operação",
    items: [
      { href: "/rh", label: "Painel", icon: LayoutDashboard, permission: null, match: (p) => p === "/rh" },
      { href: "/rh/solicitacoes", label: "Solicitações", icon: Headphones, permission: "ticket:read:any", match: starts("/rh/solicitacoes") },
    ],
  },
  {
    label: "Conteúdo",
    items: [
      { href: "/rh/comunicados", label: "Comunicados", icon: Megaphone, permission: "announcement:manage", match: starts("/rh/comunicados") },
      { href: "/rh/agenda", label: "Agenda", icon: CalendarDays, permission: "announcement:manage", match: starts("/rh/agenda"), pending: true },
      { href: "/rh/documentos", label: "Documentos", icon: FileText, permission: "document:manage", match: starts("/rh/documentos") },
      { href: "/rh/cursos", label: "Cursos", icon: GraduationCap, permission: "course:manage", match: starts("/rh/cursos"), pending: true },
      { href: "/rh/ajuda", label: "Central de ajuda", icon: BookOpenText, permission: "help:manage", match: starts("/rh/ajuda"), pending: true },
    ],
  },
  {
    label: "Pessoas",
    items: [
      { href: "/rh/colaboradores", label: "Colaboradores", icon: UsersRound, permission: "employee:read:any", match: starts("/rh/colaboradores") },
      { href: "/rh/estrutura", label: "Estrutura", icon: Network, permission: "employee:manage", match: starts("/rh/estrutura") },
      { href: "/rh/carreira", label: "Carreira", icon: ChartColumn, permission: "career:manage", match: starts("/rh/carreira"), pending: true },
      { href: "/rh/feedbacks", label: "Feedbacks", icon: MessageSquareHeart, permission: "feedback:write:any", match: starts("/rh/feedbacks"), pending: true },
    ],
  },
  {
    label: "Administração",
    items: [
      { href: "/rh/configuracoes", label: "Configurações", icon: Settings2, permission: "sla:configure", match: starts("/rh/configuracoes"), pending: true },
      { href: "/rh/auditoria", label: "Auditoria", icon: ScrollText, permission: "audit:read", match: starts("/rh/auditoria"), pending: true },
    ],
  },
];

/** Grupos filtrados pelas permissões do ator (calculado no servidor; o cliente recebe só os hrefs). */
export function allowedRhHrefs(permissions: ReadonlySet<Permission>): string[] {
  return RH_NAV.flatMap((g) => g.items.filter((i) => !i.pending && (i.permission === null || permissions.has(i.permission))).map((i) => i.href));
}

/** Link para uma tela da gestão somente se o módulo já estiver disponível (evita links quebrados durante a implantação). */
export function rhHref(href: string): string | undefined {
  const path = href.split("?")[0];
  const item = RH_NAV.flatMap((g) => g.items).find((i) => i.href !== "/rh" && (path === i.href || path.startsWith(`${i.href}/`)));
  return item?.pending ? undefined : href;
}
