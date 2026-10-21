import { getDb, type Executor } from "./db/client";
import { auditEvents } from "./db/schema";
import type { RequestMeta } from "./auth/actor";

/**
 * Ações auditadas. Metadados nunca carregam conteúdo sensível (texto de documentos, mensagens, senhas).
 */
export type AuditAction =
  | "auth.login_succeeded"
  | "auth.login_failed"
  | "auth.logout"
  | "auth.password_reset_requested"
  | "auth.password_reset_completed"
  | "auth.password_changed"
  | "auth.session_revoked"
  | "document.viewed"
  | "document.downloaded"
  | "document.acknowledged"
  | "submission.created"
  | "submission.cancelled"
  | "submission.file_downloaded"
  | "announcement.acknowledged"
  | "announcement.attachment_downloaded"
  | "ticket.created"
  | "ticket.status_changed"
  | "ticket.message_added"
  | "ticket.attachment_downloaded"
  | "course.completed"
  | "certificate.issued"
  | "opportunity.applied"
  | "opportunity.withdrawn"
  | "feedback.viewed"
  | "feedback.acknowledged"
  | "salary_band.viewed"
  | "profile.preferences_updated"
  // Gestão (RH/Administração)
  | "announcement.created"
  | "announcement.updated"
  | "announcement.published"
  | "announcement.scheduled"
  | "announcement.archived"
  | "announcement.deleted"
  | "report.exported"
  | "document.distributed"
  | "document.updated"
  | "document.version_added"
  | "document.archived"
  | "document.removed"
  | "submission.reviewed";

export async function audit(
  event: {
    action: AuditAction;
    actorUserId: string | null;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
    meta?: Partial<RequestMeta>;
  },
  db: Executor = getDb(),
) {
  await db.insert(auditEvents).values({
    action: event.action,
    actorUserId: event.actorUserId,
    entityType: event.entityType,
    entityId: event.entityId ?? null,
    metadata: event.metadata ?? null,
    ipHash: event.meta?.ipHash ?? null,
    requestId: event.meta?.requestId ?? null,
  });
}
