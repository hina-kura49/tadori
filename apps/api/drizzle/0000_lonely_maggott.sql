CREATE TYPE "public"."circle_member_role" AS ENUM('OWNER', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."circle_target_type" AS ENUM('BOOK', 'ROADMAP');--> statement-breakpoint
CREATE TYPE "public"."circle_visibility" AS ENUM('PUBLIC', 'INVITE_ONLY');--> statement-breakpoint
CREATE TYPE "public"."device_platform" AS ENUM('IOS', 'ANDROID');--> statement-breakpoint
CREATE TYPE "public"."progress_type" AS ENUM('NONE', 'PERCENTAGE', 'PAGE', 'CHAPTER');--> statement-breakpoint
CREATE TYPE "public"."roadmap_category" AS ENUM('ENGINEERING', 'PRODUCT', 'BUSINESS', 'MARKETING', 'MANAGEMENT', 'FINANCE', 'DESIGN', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."roadmap_difficulty" AS ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED');--> statement-breakpoint
CREATE TYPE "public"."roadmap_visibility" AS ENUM('PUBLIC', 'UNLISTED', 'PRIVATE');--> statement-breakpoint
CREATE TYPE "public"."step_progress_status" AS ENUM('NOT_STARTED', 'READING', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."user_roadmap_status" AS ENUM('NOT_STARTED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp (3) with time zone,
	"refresh_token_expires_at" timestamp (3) with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp (3) with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"avatar_url" text,
	"username" text NOT NULL,
	"bio" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp (3) with time zone NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"isbn13" text,
	"title" text NOT NULL,
	"subtitle" text,
	"author" text NOT NULL,
	"publisher" text,
	"cover_image_url" text,
	"description" text,
	"published_at" date,
	"external_source" text,
	"external_id" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "books_isbn13_unique" UNIQUE("isbn13")
);
--> statement-breakpoint
CREATE TABLE "roadmap_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"roadmap_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"description" text,
	"checkpoint" text NOT NULL,
	"estimated_days" integer,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roadmap_steps_roadmap_id_position_unique" UNIQUE("roadmap_id","position")
);
--> statement-breakpoint
CREATE TABLE "roadmaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" text NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"category" "roadmap_category" NOT NULL,
	"difficulty" "roadmap_difficulty" NOT NULL,
	"estimated_days" integer,
	"visibility" "roadmap_visibility" DEFAULT 'PRIVATE' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roadmaps_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_roadmap_step_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_roadmap_id" uuid NOT NULL,
	"roadmap_step_id" uuid NOT NULL,
	"status" "step_progress_status" DEFAULT 'NOT_STARTED' NOT NULL,
	"progress_type" "progress_type" DEFAULT 'NONE' NOT NULL,
	"progress_value" text,
	"started_at" timestamp (3) with time zone,
	"completed_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roadmap_step_progress_user_roadmap_id_step_id_unique" UNIQUE("user_roadmap_id","roadmap_step_id")
);
--> statement-breakpoint
CREATE TABLE "user_roadmaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"roadmap_id" uuid NOT NULL,
	"status" "user_roadmap_status" DEFAULT 'NOT_STARTED' NOT NULL,
	"started_at" timestamp (3) with time zone,
	"completed_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roadmaps_user_id_roadmap_id_unique" UNIQUE("user_id","roadmap_id")
);
--> statement-breakpoint
CREATE TABLE "circle_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"invited_user_id" text NOT NULL,
	"invited_by_id" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "circle_invites_circle_id_invited_user_id_unique" UNIQUE("circle_id","invited_user_id")
);
--> statement-breakpoint
CREATE TABLE "circle_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "circle_member_role" DEFAULT 'MEMBER' NOT NULL,
	"joined_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "circle_members_circle_id_user_id_unique" UNIQUE("circle_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "circle_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"title" text NOT NULL,
	"scheduled_at" timestamp (3) with time zone NOT NULL,
	"description" text,
	"reminder_sent_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "circles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"target_type" "circle_target_type" NOT NULL,
	"book_id" uuid,
	"roadmap_id" uuid,
	"visibility" "circle_visibility" DEFAULT 'PUBLIC' NOT NULL,
	"start_date" date,
	"target_end_date" date,
	"max_members" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "circles_target_check" CHECK (("circles"."target_type" = 'BOOK' AND "circles"."book_id" IS NOT NULL AND "circles"."roadmap_id" IS NULL)
        OR ("circles"."target_type" = 'ROADMAP' AND "circles"."roadmap_id" IS NOT NULL AND "circles"."book_id" IS NULL)),
	CONSTRAINT "circles_max_members_check" CHECK ("circles"."max_members" >= 2)
);
--> statement-breakpoint
CREATE TABLE "device_push_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"expo_push_token" text NOT NULL,
	"platform" "device_platform" NOT NULL,
	"device_id" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "device_push_tokens_expo_push_token_unique" UNIQUE("expo_push_token"),
	CONSTRAINT "device_push_tokens_user_id_device_id_unique" UNIQUE("user_id","device_id")
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"study_reminder_enabled" boolean DEFAULT false NOT NULL,
	"study_reminder_time" text DEFAULT '20:00' NOT NULL,
	"study_reminder_timezone" text DEFAULT 'Asia/Tokyo' NOT NULL,
	"circle_reminder_enabled" boolean DEFAULT true NOT NULL,
	"progress_notification_enabled" boolean DEFAULT true NOT NULL,
	"invite_notification_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_steps" ADD CONSTRAINT "roadmap_steps_roadmap_id_roadmaps_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."roadmaps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_steps" ADD CONSTRAINT "roadmap_steps_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmaps" ADD CONSTRAINT "roadmaps_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roadmap_step_progress" ADD CONSTRAINT "user_roadmap_step_progress_user_roadmap_id_user_roadmaps_id_fk" FOREIGN KEY ("user_roadmap_id") REFERENCES "public"."user_roadmaps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roadmap_step_progress" ADD CONSTRAINT "user_roadmap_step_progress_roadmap_step_id_roadmap_steps_id_fk" FOREIGN KEY ("roadmap_step_id") REFERENCES "public"."roadmap_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roadmaps" ADD CONSTRAINT "user_roadmaps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roadmaps" ADD CONSTRAINT "user_roadmaps_roadmap_id_roadmaps_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."roadmaps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_invites" ADD CONSTRAINT "circle_invites_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_invites" ADD CONSTRAINT "circle_invites_invited_user_id_users_id_fk" FOREIGN KEY ("invited_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_invites" ADD CONSTRAINT "circle_invites_invited_by_id_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_members" ADD CONSTRAINT "circle_members_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_members" ADD CONSTRAINT "circle_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_schedules" ADD CONSTRAINT "circle_schedules_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circles" ADD CONSTRAINT "circles_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circles" ADD CONSTRAINT "circles_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circles" ADD CONSTRAINT "circles_roadmap_id_roadmaps_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."roadmaps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_push_tokens" ADD CONSTRAINT "device_push_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "books_created_at_id_idx" ON "books" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "roadmap_steps_book_id_idx" ON "roadmap_steps" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "roadmaps_creator_id_idx" ON "roadmaps" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "roadmaps_visibility_created_at_id_idx" ON "roadmaps" USING btree ("visibility","created_at","id");--> statement-breakpoint
CREATE INDEX "user_roadmap_step_progress_step_id_idx" ON "user_roadmap_step_progress" USING btree ("roadmap_step_id");--> statement-breakpoint
CREATE INDEX "user_roadmaps_roadmap_id_idx" ON "user_roadmaps" USING btree ("roadmap_id");--> statement-breakpoint
CREATE INDEX "circle_invites_invited_user_id_idx" ON "circle_invites" USING btree ("invited_user_id");--> statement-breakpoint
CREATE INDEX "circle_members_user_id_idx" ON "circle_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "circle_schedules_circle_id_scheduled_at_idx" ON "circle_schedules" USING btree ("circle_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "circles_visibility_created_at_id_idx" ON "circles" USING btree ("visibility","created_at","id");--> statement-breakpoint
CREATE INDEX "circles_book_id_idx" ON "circles" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "circles_roadmap_id_idx" ON "circles" USING btree ("roadmap_id");--> statement-breakpoint
CREATE INDEX "device_push_tokens_user_id_idx" ON "device_push_tokens" USING btree ("user_id");