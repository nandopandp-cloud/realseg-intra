import type { ComponentType } from "react";
import { Award, CircleHelp, Headphones, UsersRound } from "lucide-react";
import { FEATURES } from "@/lib/features";
import { BarsSolid, DocumentSolid, GraduationSolid, MegaphoneSolid } from "@/components/ui/solid-icons";

export type ShortcutDef = {
  key: string;
  href: string;
  title: string;
  subtitle: string;
  /** Legenda curta usada no celular (referência mobile). */
  short: string;
  icon: ComponentType<{ className?: string }>;
  /** Classes do card (gradiente tonal), do quadro do ícone e da cor do ícone — conforme a referência. */
  card: string;
  tile: string;
  iconColor: string;
};

/** Catálogo de atalhos da Home (o colaborador escolhe até 4 em "Personalizar"). */
export const SHORTCUTS: Record<string, ShortcutDef> = {
  comunicados: { key: "comunicados", href: "/comunicados", title: "Comunicados", subtitle: "Avisos e novidades da empresa.", short: "Avisos e novidades", icon: MegaphoneSolid, card: "from-[#eaf8f5]", tile: "sm:bg-[#d8f1ec]", iconColor: "text-[#0b9585]" },
  documentos: { key: "documentos", href: "/documentos", title: "Meus documentos", subtitle: "Holerites, atestados e mais.", short: "Holerites, atestados e mais", icon: DocumentSolid, card: "from-[#ecf4fb]", tile: "sm:bg-[#d9ece9]", iconColor: "text-[#0b8a7c]" },
  cursos: { key: "cursos", href: "/cursos", title: "Cursos", subtitle: "Desenvolva suas habilidades.", short: "Desenvolva suas habilidades", icon: GraduationSolid, card: "from-[#f2f1fc]", tile: "sm:bg-[#e5e4f8]", iconColor: "text-[#2f3b8f]" },
  carreira: { key: "carreira", href: "/carreira", title: "Minha carreira", subtitle: "Planos de cargos e salários.", short: "Planos de cargos e salários", icon: BarsSolid, card: "from-[#fdf6ec]", tile: "sm:bg-[#f9e8d1]", iconColor: "text-[#8a4a0a]" },
  solicitacoes: { key: "solicitacoes", href: "/solicitacoes", title: "Solicitações", subtitle: "Abra e acompanhe pedidos.", short: "Abra e acompanhe pedidos", icon: Headphones, card: "from-[#eaf8f5]", tile: "sm:bg-[#d8f1ec]", iconColor: "text-[#0b9585]" },
  ajuda: { key: "ajuda", href: "/ajuda", title: "Ajuda e suporte", subtitle: "Dúvidas frequentes e tutoriais.", short: "Dúvidas e tutoriais", icon: CircleHelp, card: "from-[#ecf4fb]", tile: "sm:bg-[#dbe9f8]", iconColor: "text-blue-700" },
  "fale-com-rh": { key: "fale-com-rh", href: "/fale-com-rh", title: "Fale com o RH", subtitle: "Envie uma mensagem ao RH.", short: "Mensagem ao RH", icon: UsersRound, card: "from-[#f2f1fc]", tile: "sm:bg-[#e5e4f8]", iconColor: "text-[#2f3b8f]" },
  avaliacoes: { key: "avaliacoes", href: "/carreira/avaliacoes", title: "Feedbacks", subtitle: "Avaliações e reconhecimentos.", short: "Avaliações e reconhecimentos", icon: Award, card: "from-[#fdf6ec]", tile: "sm:bg-[#f9e8d1]", iconColor: "text-[#8a4a0a]" },
};

/** Atalhos oferecidos em "Personalizar" (sem as áreas ocultas). */
export const AVAILABLE_SHORTCUTS = Object.values(SHORTCUTS).filter((s) => FEATURES.talkToHr || s.key !== "fale-com-rh");
