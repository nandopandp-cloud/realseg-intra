import { Award, ChartColumn, CircleHelp, FileText, GraduationCap, Headphones, Megaphone, UsersRound, type LucideIcon } from "lucide-react";
import type { Tone } from "@/components/ui/icons";

export type ShortcutDef = { key: string; href: string; title: string; subtitle: string; icon: LucideIcon; tone: Tone; card: string };

/** Catálogo de atalhos da Home (o colaborador escolhe até 4 em "Personalizar"). */
export const SHORTCUTS: Record<string, ShortcutDef> = {
  comunicados: { key: "comunicados", href: "/comunicados", title: "Comunicados", subtitle: "Avisos e novidades da empresa.", icon: Megaphone, tone: "teal", card: "from-brand-50" },
  documentos: { key: "documentos", href: "/documentos", title: "Meus documentos", subtitle: "Holerites, atestados e mais.", icon: FileText, tone: "teal", card: "from-blue-50" },
  cursos: { key: "cursos", href: "/cursos", title: "Cursos", subtitle: "Desenvolva suas habilidades.", icon: GraduationCap, tone: "indigo", card: "from-indigo-50" },
  carreira: { key: "carreira", href: "/carreira", title: "Minha carreira", subtitle: "Planos de cargos e salários.", icon: ChartColumn, tone: "amber", card: "from-amber-50" },
  solicitacoes: { key: "solicitacoes", href: "/solicitacoes", title: "Solicitações", subtitle: "Abra e acompanhe pedidos.", icon: Headphones, tone: "teal", card: "from-brand-50" },
  ajuda: { key: "ajuda", href: "/ajuda", title: "Ajuda e suporte", subtitle: "Dúvidas frequentes e tutoriais.", icon: CircleHelp, tone: "blue", card: "from-blue-50" },
  "fale-com-rh": { key: "fale-com-rh", href: "/fale-com-rh", title: "Fale com o RH", subtitle: "Envie uma mensagem ao RH.", icon: UsersRound, tone: "indigo", card: "from-indigo-50" },
  avaliacoes: { key: "avaliacoes", href: "/carreira/avaliacoes", title: "Feedbacks", subtitle: "Avaliações e reconhecimentos.", icon: Award, tone: "amber", card: "from-amber-50" },
};
