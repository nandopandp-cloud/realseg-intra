CREATE TYPE "public"."audience_type" AS ENUM('all', 'department', 'unit', 'job_position', 'job_family');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."employee_status" AS ENUM('ativo', 'afastado', 'desligado');--> statement-breakpoint
CREATE TYPE "public"."file_scan_status" AS ENUM('pending', 'clean', 'infected', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."notification_category" AS ENUM('comunicados', 'documentos', 'solicitacoes', 'cursos', 'carreira', 'feedbacks', 'conta');--> statement-breakpoint
CREATE TYPE "public"."announcement_status" AS ENUM('draft', 'scheduled', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('scheduled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."document_category_kind" AS ENUM('personal', 'institutional', 'submission');--> statement-breakpoint
CREATE TYPE "public"."document_scope" AS ENUM('personal', 'institutional');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('enviado', 'em_analise', 'aceito', 'recusado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."ticket_event_type" AS ENUM('created', 'status_changed', 'assigned', 'priority_changed', 'sla_paused', 'sla_resumed', 'sla_warning', 'sla_breached', 'message_added');--> statement-breakpoint
CREATE TYPE "public"."ticket_priority" AS ENUM('baixa', 'normal', 'alta', 'urgente');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('aberto', 'em_andamento', 'aguardando_colaborador', 'respondido', 'resolvido', 'fechado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."course_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."enrollment_source" AS ENUM('self', 'assigned');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('em_andamento', 'concluido');--> statement-breakpoint
CREATE TYPE "public"."lesson_type" AS ENUM('texto', 'video', 'material');--> statement-breakpoint
CREATE TYPE "public"."achievement_kind" AS ENUM('auto', 'manual');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('enviada', 'em_analise', 'encerrada', 'retirada');--> statement-breakpoint
CREATE TYPE "public"."development_goal_status" AS ENUM('pendente', 'em_andamento', 'concluida');--> statement-breakpoint
CREATE TYPE "public"."opportunity_status" AS ENUM('draft', 'published', 'closed');--> statement-breakpoint
CREATE TYPE "public"."feedback_status" AS ENUM('rascunho', 'publicado', 'arquivado');--> statement-breakpoint
CREATE TYPE "public"."feedback_type" AS ENUM('feedback', 'avaliacao', 'reconhecimento');--> statement-breakpoint
CREATE TYPE "public"."help_article_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."help_article_type" AS ENUM('artigo', 'tutorial', 'faq');--> statement-breakpoint
CREATE SEQUENCE "public"."document_submission_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1000 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."ticket_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1000 CACHE 1;--> statement-breakpoint
CREATE TABLE "mail_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"to" text NOT NULL,
	"subject" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"key" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_key" text NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_key_pk" PRIMARY KEY("role_id","permission_key")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"user_agent" text,
	"ip_hash" text
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"scope_department_id" uuid,
	"granted_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_uq" UNIQUE NULLS NOT DISTINCT("user_id","role_id","scope_department_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"failed_login_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"password_changed_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"parent_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"preferred_name" text,
	"registration_number" text NOT NULL,
	"department_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"job_position_id" uuid NOT NULL,
	"manager_employee_id" uuid,
	"admission_date" date NOT NULL,
	"status" "employee_status" DEFAULT 'ativo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "employees_registration_number_unique" UNIQUE("registration_number")
);
--> statement-breakpoint
CREATE TABLE "job_families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_families_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "job_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"family_id" uuid NOT NULL,
	"level" integer NOT NULL,
	"level_label" text NOT NULL,
	"description" text,
	"requirements" text,
	"progression_criteria" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "units_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"metadata" jsonb,
	"ip_hash" text,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_key" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"uploaded_by_user_id" uuid,
	"scan_status" "file_scan_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "file_assets_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" uuid NOT NULL,
	"category" "notification_category" NOT NULL,
	"in_app" boolean DEFAULT true NOT NULL,
	"email" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_user_id_category_pk" PRIMARY KEY("user_id","category")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" "notification_category" NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"entity_type" text,
	"entity_id" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"home_shortcuts" text[],
	"sidebar_collapsed" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcement_acknowledgements" (
	"announcement_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"acknowledged_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "announcement_acknowledgements_announcement_id_user_id_version_pk" PRIMARY KEY("announcement_id","user_id","version")
);
--> statement-breakpoint
CREATE TABLE "announcement_attachments" (
	"announcement_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "announcement_attachments_announcement_id_file_id_pk" PRIMARY KEY("announcement_id","file_id")
);
--> statement-breakpoint
CREATE TABLE "announcement_audiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"announcement_id" uuid NOT NULL,
	"type" "audience_type" NOT NULL,
	"ref_id" uuid
);
--> statement-breakpoint
CREATE TABLE "announcement_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"icon" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "announcement_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "announcement_favorites" (
	"announcement_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "announcement_favorites_announcement_id_user_id_pk" PRIMARY KEY("announcement_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "announcement_reads" (
	"announcement_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "announcement_reads_announcement_id_user_id_version_pk" PRIMARY KEY("announcement_id","user_id","version")
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"body" text NOT NULL,
	"is_important" boolean DEFAULT false NOT NULL,
	"requires_ack" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"status" "announcement_status" DEFAULT 'draft' NOT NULL,
	"publish_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"author_user_id" uuid,
	"author_label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"location" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"unit_id" uuid,
	"announcement_id" uuid,
	"status" "event_status" DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_acknowledgements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"acknowledged_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_ack_uq" UNIQUE("version_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "document_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" "document_category_kind" NOT NULL,
	"description" text,
	"color" text NOT NULL,
	"icon" text NOT NULL,
	"sensitive" boolean DEFAULT false NOT NULL,
	"retention_months" integer,
	"position" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "document_submission_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"from_status" "submission_status",
	"to_status" "submission_status" NOT NULL,
	"actor_user_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer DEFAULT nextval('document_submission_number_seq') NOT NULL,
	"employee_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"reference_date" date,
	"file_id" uuid NOT NULL,
	"status" "submission_status" DEFAULT 'enviado' NOT NULL,
	"reviewer_user_id" uuid,
	"review_note" text,
	"reviewed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_submissions_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"file_id" uuid NOT NULL,
	"change_note" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_versions_uq" UNIQUE("document_id","version_number")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"scope" "document_scope" NOT NULL,
	"owner_employee_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"reference_period" text,
	"requires_ack" boolean DEFAULT false NOT NULL,
	"effective_from" date,
	"effective_until" date,
	"current_version_id" uuid,
	"status" "document_status" DEFAULT 'active' NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "documents_personal_owner_ck" CHECK ("documents"."scope" <> 'personal' OR "documents"."owner_employee_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "sla_calendars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"timezone" text DEFAULT 'America/Sao_Paulo' NOT NULL,
	"working_hours" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sla_calendars_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sla_holidays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"calendar_id" uuid NOT NULL,
	"date" date NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "sla_holidays_uq" UNIQUE("calendar_id","date")
);
--> statement-breakpoint
CREATE TABLE "sla_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"priority" "ticket_priority" NOT NULL,
	"calendar_id" uuid NOT NULL,
	"first_response_minutes" integer NOT NULL,
	"resolution_minutes" integer NOT NULL,
	"pause_statuses" "ticket_status"[] DEFAULT ARRAY['aguardando_colaborador']::ticket_status[] NOT NULL,
	"warn_at_percent" integer DEFAULT 80 NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"superseded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ticket_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"message_id" uuid,
	"file_id" uuid NOT NULL,
	"uploaded_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"color" text NOT NULL,
	"icon" text NOT NULL,
	"default_priority" "ticket_priority" DEFAULT 'normal' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "ticket_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"category_id" uuid,
	"subject" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"type" "ticket_event_type" NOT NULL,
	"from_value" text,
	"to_value" text,
	"actor_user_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"author_user_id" uuid,
	"body" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_participants" (
	"ticket_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"added_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_participants_ticket_id_user_id_pk" PRIMARY KEY("ticket_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer DEFAULT nextval('ticket_number_seq') NOT NULL,
	"requester_employee_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"priority" "ticket_priority" NOT NULL,
	"status" "ticket_status" DEFAULT 'aberto' NOT NULL,
	"assignee_user_id" uuid,
	"sla_policy_id" uuid,
	"first_response_due_at" timestamp with time zone,
	"resolution_due_at" timestamp with time zone,
	"first_responded_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"paused_at" timestamp with time zone,
	"paused_business_minutes" integer DEFAULT 0 NOT NULL,
	"first_response_breached_at" timestamp with time zone,
	"resolution_breached_at" timestamp with time zone,
	"warned_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tickets_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"code" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "certificates_enrollment_id_unique" UNIQUE("enrollment_id"),
	CONSTRAINT "certificates_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "course_audiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"type" "audience_type" NOT NULL,
	"ref_id" uuid
);
--> statement-breakpoint
CREATE TABLE "course_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"icon" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "course_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "course_modules_position_uq" UNIQUE("course_id","position")
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"description" text NOT NULL,
	"category_id" uuid NOT NULL,
	"cover_image" text,
	"is_mandatory" boolean DEFAULT false NOT NULL,
	"mandatory_due_days" integer,
	"issues_certificate" boolean DEFAULT false NOT NULL,
	"status" "course_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"source" "enrollment_source" DEFAULT 'self' NOT NULL,
	"status" "enrollment_status" DEFAULT 'em_andamento' NOT NULL,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"last_lesson_id" uuid,
	"due_at" timestamp with time zone,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrollments_uq" UNIQUE("course_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "learning_path_courses" (
	"path_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "learning_path_courses_path_id_course_id_pk" PRIMARY KEY("path_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "learning_paths" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"color" text NOT NULL,
	"icon" text NOT NULL,
	"job_family_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_paths_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"enrollment_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_progress_enrollment_id_lesson_id_pk" PRIMARY KEY("enrollment_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"title" text NOT NULL,
	"type" "lesson_type" NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"video_url" text,
	"material_file_id" uuid,
	"duration_minutes" integer NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "lessons_position_uq" UNIQUE("module_id","position")
);
--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"kind" "achievement_kind" NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"icon" text NOT NULL,
	"color" text NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "achievements_code_uq" UNIQUE("employee_id","code")
);
--> statement-breakpoint
CREATE TABLE "development_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"due_date" date,
	"starts_on" date,
	"status" "development_goal_status" DEFAULT 'pendente' NOT NULL,
	"course_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" uuid,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"job_position_id" uuid,
	"department_id" uuid,
	"unit_id" uuid,
	"area_label" text NOT NULL,
	"description" text NOT NULL,
	"requirements" text NOT NULL,
	"status" "opportunity_status" DEFAULT 'draft' NOT NULL,
	"is_highlighted" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"closes_at" timestamp with time zone,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"status" "application_status" DEFAULT 'enviada' NOT NULL,
	"message" text,
	"withdrawn_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunity_applications_uq" UNIQUE("opportunity_id","employee_id")
);
--> statement-breakpoint
CREATE TABLE "opportunity_eligibility" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"type" "audience_type" NOT NULL,
	"ref_id" uuid
);
--> statement-breakpoint
CREATE TABLE "salary_bands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_position_id" uuid NOT NULL,
	"min_cents" integer NOT NULL,
	"max_cents" integer NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"effective_from" date NOT NULL,
	"effective_until" date,
	"visible_to_employees" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedbacks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"author_user_id" uuid,
	"show_author" boolean DEFAULT true NOT NULL,
	"author_context" text NOT NULL,
	"type" "feedback_type" NOT NULL,
	"title" text NOT NULL,
	"cycle" text,
	"body" text NOT NULL,
	"status" "feedback_status" DEFAULT 'rascunho' NOT NULL,
	"published_at" timestamp with time zone,
	"acknowledged_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "help_article_feedback" (
	"article_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"helpful" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "help_article_feedback_article_id_user_id_pk" PRIMARY KEY("article_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "help_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"category_id" uuid NOT NULL,
	"type" "help_article_type" DEFAULT 'artigo' NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"body" text NOT NULL,
	"icon" text DEFAULT 'file-text' NOT NULL,
	"color" text DEFAULT 'teal' NOT NULL,
	"status" "help_article_status" DEFAULT 'draft' NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"related_ticket_category_id" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "help_articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "help_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"color" text NOT NULL,
	"icon" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "help_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_key_permissions_key_fk" FOREIGN KEY ("permission_key") REFERENCES "public"."permissions"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_scope_department_id_departments_id_fk" FOREIGN KEY ("scope_department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_granted_by_user_id_users_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_id_departments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_job_position_id_job_positions_id_fk" FOREIGN KEY ("job_position_id") REFERENCES "public"."job_positions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_manager_employee_id_employees_id_fk" FOREIGN KEY ("manager_employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_positions" ADD CONSTRAINT "job_positions_family_id_job_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."job_families"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_acknowledgements" ADD CONSTRAINT "announcement_acknowledgements_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_acknowledgements" ADD CONSTRAINT "announcement_acknowledgements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_attachments" ADD CONSTRAINT "announcement_attachments_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_attachments" ADD CONSTRAINT "announcement_attachments_file_id_file_assets_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_audiences" ADD CONSTRAINT "announcement_audiences_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_favorites" ADD CONSTRAINT "announcement_favorites_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_favorites" ADD CONSTRAINT "announcement_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_reads" ADD CONSTRAINT "announcement_reads_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_reads" ADD CONSTRAINT "announcement_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_category_id_announcement_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."announcement_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_acknowledgements" ADD CONSTRAINT "document_acknowledgements_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_acknowledgements" ADD CONSTRAINT "document_acknowledgements_version_id_document_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."document_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_acknowledgements" ADD CONSTRAINT "document_acknowledgements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_submission_events" ADD CONSTRAINT "document_submission_events_submission_id_document_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."document_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_submission_events" ADD CONSTRAINT "document_submission_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_submissions" ADD CONSTRAINT "document_submissions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_submissions" ADD CONSTRAINT "document_submissions_category_id_document_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."document_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_submissions" ADD CONSTRAINT "document_submissions_file_id_file_assets_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_submissions" ADD CONSTRAINT "document_submissions_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_file_id_file_assets_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_category_id_document_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."document_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_owner_employee_id_employees_id_fk" FOREIGN KEY ("owner_employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sla_holidays" ADD CONSTRAINT "sla_holidays_calendar_id_sla_calendars_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."sla_calendars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sla_policies" ADD CONSTRAINT "sla_policies_category_id_ticket_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."ticket_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sla_policies" ADD CONSTRAINT "sla_policies_calendar_id_sla_calendars_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."sla_calendars"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sla_policies" ADD CONSTRAINT "sla_policies_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_message_id_ticket_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."ticket_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_file_id_file_assets_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_drafts" ADD CONSTRAINT "ticket_drafts_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_drafts" ADD CONSTRAINT "ticket_drafts_category_id_ticket_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."ticket_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_events" ADD CONSTRAINT "ticket_events_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_events" ADD CONSTRAINT "ticket_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_participants" ADD CONSTRAINT "ticket_participants_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_participants" ADD CONSTRAINT "ticket_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_participants" ADD CONSTRAINT "ticket_participants_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_requester_employee_id_employees_id_fk" FOREIGN KEY ("requester_employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_category_id_ticket_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."ticket_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignee_user_id_users_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_sla_policy_id_sla_policies_id_fk" FOREIGN KEY ("sla_policy_id") REFERENCES "public"."sla_policies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_audiences" ADD CONSTRAINT "course_audiences_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_modules" ADD CONSTRAINT "course_modules_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_category_id_course_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."course_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_last_lesson_id_lessons_id_fk" FOREIGN KEY ("last_lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_path_courses" ADD CONSTRAINT "learning_path_courses_path_id_learning_paths_id_fk" FOREIGN KEY ("path_id") REFERENCES "public"."learning_paths"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_path_courses" ADD CONSTRAINT "learning_path_courses_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_job_family_id_job_families_id_fk" FOREIGN KEY ("job_family_id") REFERENCES "public"."job_families"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_module_id_course_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."course_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_material_file_id_file_assets_id_fk" FOREIGN KEY ("material_file_id") REFERENCES "public"."file_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development_goals" ADD CONSTRAINT "development_goals_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development_goals" ADD CONSTRAINT "development_goals_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development_goals" ADD CONSTRAINT "development_goals_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_opportunities" ADD CONSTRAINT "internal_opportunities_job_position_id_job_positions_id_fk" FOREIGN KEY ("job_position_id") REFERENCES "public"."job_positions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_opportunities" ADD CONSTRAINT "internal_opportunities_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_opportunities" ADD CONSTRAINT "internal_opportunities_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_opportunities" ADD CONSTRAINT "internal_opportunities_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_applications" ADD CONSTRAINT "opportunity_applications_opportunity_id_internal_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."internal_opportunities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_applications" ADD CONSTRAINT "opportunity_applications_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_eligibility" ADD CONSTRAINT "opportunity_eligibility_opportunity_id_internal_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."internal_opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_bands" ADD CONSTRAINT "salary_bands_job_position_id_job_positions_id_fk" FOREIGN KEY ("job_position_id") REFERENCES "public"."job_positions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_article_feedback" ADD CONSTRAINT "help_article_feedback_article_id_help_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."help_articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_article_feedback" ADD CONSTRAINT "help_article_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_articles" ADD CONSTRAINT "help_articles_category_id_help_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."help_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_articles" ADD CONSTRAINT "help_articles_related_ticket_category_id_ticket_categories_id_fk" FOREIGN KEY ("related_ticket_category_id") REFERENCES "public"."ticket_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "user_roles_user_idx" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_uq" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "employees_department_idx" ON "employees" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "employees_unit_idx" ON "employees" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "employees_manager_idx" ON "employees" USING btree ("manager_employee_id");--> statement-breakpoint
CREATE INDEX "job_positions_family_idx" ON "job_positions" USING btree ("family_id","level");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_events" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_action_idx" ON "audit_events" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_unread_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "announcement_audiences_ann_idx" ON "announcement_audiences" USING btree ("announcement_id");--> statement-breakpoint
CREATE INDEX "announcement_reads_user_idx" ON "announcement_reads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "announcements_status_published_idx" ON "announcements" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "events_starts_idx" ON "events" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "document_ack_user_idx" ON "document_acknowledgements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "document_submission_events_sub_idx" ON "document_submission_events" USING btree ("submission_id","created_at");--> statement-breakpoint
CREATE INDEX "document_submissions_employee_idx" ON "document_submissions" USING btree ("employee_id","created_at");--> statement-breakpoint
CREATE INDEX "document_submissions_status_idx" ON "document_submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "documents_owner_idx" ON "documents" USING btree ("owner_employee_id","created_at");--> statement-breakpoint
CREATE INDEX "documents_scope_category_idx" ON "documents" USING btree ("scope","category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sla_policies_active_uq" ON "sla_policies" USING btree ("category_id","priority") WHERE "sla_policies"."superseded_at" IS NULL;--> statement-breakpoint
CREATE INDEX "ticket_attachments_ticket_idx" ON "ticket_attachments" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "ticket_drafts_employee_idx" ON "ticket_drafts" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "ticket_events_ticket_idx" ON "ticket_events" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "ticket_messages_ticket_idx" ON "ticket_messages" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "ticket_participants_user_idx" ON "ticket_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tickets_requester_idx" ON "tickets" USING btree ("requester_employee_id","created_at");--> statement-breakpoint
CREATE INDEX "tickets_status_idx" ON "tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tickets_assignee_idx" ON "tickets" USING btree ("assignee_user_id");--> statement-breakpoint
CREATE INDEX "course_audiences_course_idx" ON "course_audiences" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "courses_category_idx" ON "courses" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "courses_status_idx" ON "courses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "enrollments_user_idx" ON "enrollments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "development_goals_employee_idx" ON "development_goals" USING btree ("employee_id","position");--> statement-breakpoint
CREATE INDEX "internal_opportunities_status_idx" ON "internal_opportunities" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "opportunity_eligibility_opp_idx" ON "opportunity_eligibility" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "salary_bands_position_idx" ON "salary_bands" USING btree ("job_position_id","effective_from");--> statement-breakpoint
CREATE INDEX "feedbacks_employee_idx" ON "feedbacks" USING btree ("employee_id","status","published_at");--> statement-breakpoint
CREATE INDEX "help_articles_category_idx" ON "help_articles" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "help_articles_views_idx" ON "help_articles" USING btree ("view_count");