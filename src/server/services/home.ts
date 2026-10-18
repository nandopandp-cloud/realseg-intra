import type { Ctx } from "../auth/actor";
import { highlightedAnnouncement, pendingAcknowledgementsCount } from "./announcements";
import { pendingDocumentAcks, recentDocuments } from "./documents";
import { myLearningSummary } from "./courses";
import { awaitingMeCount, openTicketsSummary } from "./tickets";
import { pendingFeedbackAcks } from "./feedbacks";
import { getPreferences } from "./profile";

/** Dados da Home em uma chamada (cada parte aplica a própria autorização). */
export async function homeData(ctx: Ctx) {
  const [prefs, highlight, tickets, docs, pendingAnn, pendingDocs, learning, awaiting, feedbacks] = await Promise.all([
    getPreferences(ctx),
    highlightedAnnouncement(ctx),
    openTicketsSummary(ctx, 3),
    recentDocuments(ctx, 3),
    pendingAcknowledgementsCount(ctx),
    pendingDocumentAcks(ctx),
    myLearningSummary(ctx),
    awaitingMeCount(ctx),
    pendingFeedbackAcks(ctx),
  ]);
  const pending = [
    pendingDocs.personal + pendingDocs.policies > 0 && {
      key: "docs",
      label: `${pendingDocs.personal + pendingDocs.policies} ${pendingDocs.personal + pendingDocs.policies === 1 ? "documento aguarda" : "documentos aguardam"} sua ciência`,
      href: pendingDocs.personal > 0 ? "/documentos?status=pendente" : "/documentos/normas",
    },
    pendingAnn > 0 && { key: "ann", label: `${pendingAnn} ${pendingAnn === 1 ? "comunicado exige" : "comunicados exigem"} confirmação de leitura`, href: "/comunicados?aba=importantes" },
    awaiting > 0 && { key: "tickets", label: `${awaiting} ${awaiting === 1 ? "solicitação aguarda" : "solicitações aguardam"} sua resposta`, href: "/solicitacoes?aba=aguardando" },
    learning.obrigatoriosPendentes > 0 && { key: "courses", label: `${learning.obrigatoriosPendentes} ${learning.obrigatoriosPendentes === 1 ? "curso obrigatório pendente" : "cursos obrigatórios pendentes"}`, href: "/cursos?filtro=obrigatorios" },
    feedbacks > 0 && { key: "feedbacks", label: `${feedbacks} ${feedbacks === 1 ? "feedback novo" : "feedbacks novos"} para ler`, href: "/carreira/avaliacoes" },
  ].filter(Boolean) as Array<{ key: string; label: string; href: string }>;
  return { shortcuts: prefs.homeShortcuts, highlight, tickets, docs, pending };
}
