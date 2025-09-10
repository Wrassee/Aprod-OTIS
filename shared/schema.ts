import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  uuid, // FONTOS: uuid importálása
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/* -------------------------------------------------------------------------
 * Protocols
 * ----------------------------------------------------------------------- */
export const protocols = pgTable("protocols", {
  id: uuid("id") // JAVÍTVA: text -> uuid
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  reception_date: text("reception_date"),
  language: text("language").notNull(),
  answers: jsonb("answers")
    .notNull()
    .default({} as Record<string, unknown>),
  errors: jsonb("errors").notNull().default([] as unknown[]),
  signature: text("signature"),
  signature_name: text("signature_name"),
  completed: boolean("completed").notNull().default(false),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertProtocolSchema = createInsertSchema(protocols);
export type Protocol = typeof protocols.$inferSelect;
export type InsertProtocol = typeof protocols.$inferInsert;

/* -------------------------------------------------------------------------
 * Zod schemas / TypeScript types used throughout the project
 * ----------------------------------------------------------------------- */
export const ErrorSeverityEnum = z.enum(["critical", "medium", "low"]);
export type ErrorSeverity = z.infer<typeof ErrorSeverityEnum>;

export const ProtocolErrorSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  severity: ErrorSeverityEnum,
  images: z.array(z.string()).default([]),
});
export type ProtocolError = z.infer<typeof ProtocolErrorSchema>;

/* -------------------------------------------------------------------------
 * Templates
 * ----------------------------------------------------------------------- */
export const templates = pgTable("templates", {
  id: uuid("id") // JAVÍTVA: text -> uuid
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  type: text("type").notNull(),
  file_name: text("file_name").notNull(),
  file_path: text("file_path").notNull(),
  language: text("language")
    .notNull()
    .default("multilingual"),
  uploaded_at: timestamp("uploaded_at").defaultNow().notNull(),
  is_active: boolean("is_active").notNull().default(false),
});

export const insertTemplateSchema = createInsertSchema(templates);
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;

/* -------------------------------------------------------------------------
 * Question configurations – single source of truth for questions
 * ----------------------------------------------------------------------- */
export const QuestionTypeEnum = z.enum(["text", "number", "date", "select", "checkbox"]);
export type QuestionType = "number" | "date" | "select" | "text" | "checkbox" | "radio" | "measurement" | "calculated" | "true_false" | "yes_no_na";

export const questionConfigs = pgTable("question_configs", {
  id: uuid("id") // JAVÍTVA: text -> uuid
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  template_id: uuid("template_id") // JAVÍTVA: text -> uuid
    .notNull()
    .references(() => templates.id, { onDelete: 'cascade' }),
  question_id: text("question_id").notNull(),
  title: text("title").notNull(),
  title_hu: text("title_hu"),
  title_de: text("title_de"),
  type: text("type").notNull(),
  required: boolean("required").notNull().default(true),
  placeholder: text("placeholder"),
  cell_reference: text("cell_reference"),
  sheet_name: text("sheet_name").default("Sheet1"),
  multi_cell: boolean("multi_cell").notNull().default(false),
  group_name: text("group_name"),
  group_name_de: text("group_name_de"),
  group_order: integer("group_order").default(0),
  unit: text("unit"),
  min_value: integer("min_value"),
  max_value: integer("max_value"),
  calculation_formula: text("calculation_formula"),
  calculation_inputs: jsonb("calculation_inputs"), // Ezt hagyjuk jsonb-n, a Drizzle helyesen fogja kezelni a migrációt
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertQuestionConfigSchema = createInsertSchema(questionConfigs);
export type QuestionConfig = typeof questionConfigs.$inferSelect;
export type InsertQuestionConfig = typeof questionConfigs.$inferInsert;

export type Question = QuestionConfig;

/* -------------------------------------------------------------------------
 * Relations – enables eager loading with Drizzle
 * ----------------------------------------------------------------------- */
export const templatesRelations = relations(templates, ({ many }) => ({
  questionConfigs: many(questionConfigs),
}));

export const questionConfigsRelations = relations(
  questionConfigs,
  ({ one }) => ({
    template: one(templates, {
      fields: [questionConfigs.template_id],
      references: [templates.id],
    }),
  }),
);