import { ChartColumn, CircleHelp, FileText, GraduationCap, Headphones, House, Megaphone, MessageCircle, UsersRound, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; match?: (path: string) => boolean };

const starts = (prefix: string) => (p: string) => p === prefix || p.startsWith(`${prefix}/`);

export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Início", icon: House, match: (p) => p === "/" },
  { href: "/comunicados", label: "Comunicados", icon: Megaphone, match: starts("/comunicados") },
  { href: "/documentos", label: "Documentos", icon: FileText, match: starts("/documentos") },
  { href: "/cursos", label: "Cursos", icon: GraduationCap, match: starts("/cursos") },
  { href: "/carreira", label: "Minha carreira", icon: ChartColumn, match: starts("/carreira") },
  { href: "/solicitacoes", label: "Minhas solicitações", icon: Headphones, match: starts("/solicitacoes") },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/ajuda", label: "Ajuda e suporte", icon: CircleHelp, match: starts("/ajuda") },
  { href: "/fale-com-rh", label: "Fale com o RH", icon: UsersRound, match: starts("/fale-com-rh") },
];

/** Barra inferior mobile (ADR-0009). */
export const MOBILE_NAV: NavItem[] = [
  { href: "/", label: "Início", icon: House, match: (p) => p === "/" },
  { href: "/documentos", label: "Documentos", icon: FileText, match: starts("/documentos") },
  { href: "/comunicados", label: "Comunicação", icon: MessageCircle, match: starts("/comunicados") },
  { href: "/solicitacoes", label: "Solicitações", icon: Headphones, match: starts("/solicitacoes") },
];
