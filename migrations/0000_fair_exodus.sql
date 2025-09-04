CREATE TABLE "protocols" (
	"id" uuid PRIMARY KEY NOT NULL,
	"reception_date" text,
	"language" text NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"signature" text,
	"signature_name" text,
	"completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_configs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"template_id" uuid NOT NULL,
	"question_id" text NOT NULL,
	"title" text NOT NULL,
	"title_hu" text,
	"title_de" text,
	"type" text NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"placeholder" text,
	"cell_reference" text,
	"sheet_name" text DEFAULT 'Sheet1',
	"multi_cell" boolean DEFAULT false NOT NULL,
	"group_name" text,
	"group_name_de" text,
	"group_order" integer DEFAULT 0,
	"unit" text,
	"min_value" integer,
	"max_value" integer,
	"calculation_formula" text,
	"calculation_inputs" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"file_name" text NOT NULL,
	"file_path" text NOT NULL,
	"language" text DEFAULT 'multilingual' NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "question_configs" ADD CONSTRAINT "question_configs_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;