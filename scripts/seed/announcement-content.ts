/**
 * Conteúdo estruturado dos comunicados de DEMONSTRAÇÃO (página de leitura — referencias/Colado 2026-10-18 às 12.08.10.png).
 * A migration drizzle/0003_announcement_detail.sql aplica o mesmo conteúdo em bancos de demonstração já populados.
 */
import type { AnnouncementHighlight } from "@/server/db/schema";

type Detail = {
  coverImage?: string;
  effectiveNote?: string;
  highlights?: AnnouncementHighlight[];
  tags?: string[];
  supportTicketCategory?: string;
  body?: string;
};

export const ANNOUNCEMENT_DETAILS: Record<string, Detail> = {
  uniforme: {
    coverImage: "/images/comunicado-uniforme.webp",
    effectiveNote: "A partir de 1º de novembro de 2026, entram em vigor as novas orientações sobre o uso do uniforme e dos equipamentos de identificação.",
    highlights: [
      { icon: "shirt", title: "Crachá visível durante toda a jornada", text: "O crachá deve permanecer visível em todos os ambientes de trabalho." },
      { icon: "badge", title: "Camisa polo obrigatória em serviços externos", text: "A camisa polo REALSEG passa a ser obrigatória em todas as atividades externas." },
      { icon: "boot", title: "Calçados de segurança nas áreas operacionais", text: "O uso de calçados de segurança passa a ser obrigatório nas áreas operacionais." },
    ],
    tags: ["Uniforme", "Crachá", "Segurança", "Operações", "Equipamentos"],
    supportTicketCategory: "servicos",
    body: [
      "## Por que essa mudança?",
      "A padronização do uniforme e dos equipamentos de identificação reforça a segurança da nossa equipe, melhora a identificação em campo, fortalece a nossa marca e garante o cumprimento das normas dos nossos clientes e parceiros.",
    ].join("\n\n"),
  },
  "boas-praticas": {
    coverImage: "/images/thumb-boas-praticas.webp",
    tags: ["Segurança", "Equipamentos"],
  },
  cracha: {
    coverImage: "/images/thumb-cracha.webp",
    tags: ["Crachá", "Uniforme"],
  },
  campanha: { tags: ["Segurança"] },
  sipat: { tags: ["Segurança", "Eventos"] },
};
