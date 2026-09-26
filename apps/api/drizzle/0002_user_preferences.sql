CREATE TABLE "user_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"interests" "roadmap_category"[] DEFAULT '{}' NOT NULL,
	"primary_roadmap_id" uuid,
	"onboarded_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_primary_roadmap_id_roadmaps_id_fk" FOREIGN KEY ("primary_roadmap_id") REFERENCES "public"."roadmaps"("id") ON DELETE set null ON UPDATE no action;