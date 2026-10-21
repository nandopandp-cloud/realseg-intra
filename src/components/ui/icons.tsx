import { createElement } from "react";
import {
  Award,
  BadgeCheck,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  ChartColumn,
  CircleCheck,
  CircleHelp,
  Clock,
  File,
  FileCheck,
  FileText,
  GraduationCap,
  Headphones,
  Laptop,
  Lightbulb,
  Lock,
  Megaphone,
  MessageCircle,
  Receipt,
  Settings,
  ShieldCheck,
  Shirt,
  Star,
  Stethoscope,
  Trophy,
  Truck,
  Upload,
  UserRound,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/** Ícones referenciados por chave no banco (categorias, artigos, conquistas). */
const MAP: Record<string, LucideIcon> = {
  award: Award,
  "badge-check": BadgeCheck,
  "book-open": BookOpen,
  briefcase: Briefcase,
  "building-2": Building2,
  "calendar-days": CalendarDays,
  "chart-column": ChartColumn,
  "circle-check": CircleCheck,
  "circle-help": CircleHelp,
  clock: Clock,
  file: File,
  "file-check": FileCheck,
  "file-text": FileText,
  "graduation-cap": GraduationCap,
  headphones: Headphones,
  laptop: Laptop,
  lightbulb: Lightbulb,
  lock: Lock,
  megaphone: Megaphone,
  "message-circle": MessageCircle,
  receipt: Receipt,
  settings: Settings,
  "shield-check": ShieldCheck,
  shirt: Shirt,
  star: Star,
  stethoscope: Stethoscope,
  trophy: Trophy,
  truck: Truck,
  upload: Upload,
  "user-round": UserRound,
  users: Users,
  wrench: Wrench,
};

/** Chaves disponíveis para escolha na gestão (categorias, trilhas). */
export const ICON_KEYS = Object.keys(MAP);

export function iconFor(key: string | null | undefined): LucideIcon {
  return (key && MAP[key]) || FileText;
}

export type Tone = "teal" | "blue" | "indigo" | "purple" | "amber" | "red" | "orange" | "slate" | "green";

/** Classes de fundo/ícone por tom (fundos claros + ícone saturado, como nas referências). */
export const TONE: Record<Tone, { tile: string; icon: string; soft: string; text: string; dot: string }> = {
  teal: { tile: "bg-brand-50", icon: "text-brand-600", soft: "bg-brand-100", text: "text-brand-700", dot: "bg-brand-500" },
  blue: { tile: "bg-blue-50", icon: "text-blue-600", soft: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-600" },
  indigo: { tile: "bg-indigo-50", icon: "text-indigo-700", soft: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-600" },
  purple: { tile: "bg-indigo-50", icon: "text-indigo-600", soft: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-600" },
  amber: { tile: "bg-amber-50", icon: "text-amber-600", soft: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-600" },
  red: { tile: "bg-red-50", icon: "text-red-600", soft: "bg-red-100", text: "text-red-700", dot: "bg-red-600" },
  orange: { tile: "bg-orange-100", icon: "text-orange-700", soft: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-700" },
  slate: { tile: "bg-slate-100", icon: "text-slate-700", soft: "bg-slate-100", text: "text-slate-700", dot: "bg-muted" },
  green: { tile: "bg-green-100", icon: "text-green-700", soft: "bg-green-100", text: "text-green-700", dot: "bg-green-700" },
};

export const toTone = (v: string | null | undefined): Tone => (v && v in TONE ? (v as Tone) : "slate");

/** Renderiza ícone a partir da chave salva no banco (sem criar componentes durante o render). */
export function IconByKey({ name, className, strokeWidth }: { name: string | null | undefined; className?: string; strokeWidth?: number }) {
  return createElement(iconFor(name), { className, strokeWidth, "aria-hidden": true });
}
