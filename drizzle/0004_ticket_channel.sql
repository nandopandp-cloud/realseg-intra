CREATE TYPE "public"."ticket_channel" AS ENUM('portal', 'chat');--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "channel" "ticket_channel" DEFAULT 'portal' NOT NULL;