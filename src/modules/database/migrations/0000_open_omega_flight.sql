CREATE TABLE IF NOT EXISTS "user_fs_entitlements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"fs_license_id" varchar(255) NOT NULL,
	"fs_plan_id" varchar(255) NOT NULL,
	"fs_pricing_id" varchar(255),
	"fs_user_id" varchar(255) NOT NULL,
	"type" varchar(50),
	"expiration" timestamp,
	"is_canceled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_fs_entitlements_fs_license_id_unique" UNIQUE("fs_license_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"email" varchar(255) NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_fs_entitlements" ADD CONSTRAINT "user_fs_entitlements_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
