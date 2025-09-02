import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/* -------------------------------------------------------------------------
 *  Protocols
 * ----------------------------------------------------------------------- */
export const protocols = pgTable("protocols", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  receptionDate: text("reception_date").notNull(),
  language: text("language").notNull(),
  answers: jsonb("answers")
    .notNull()
    .default({} as Record<string, unknown>),
  errors: jsonb("errors").notNull().default([] as unknown[]),
  signature: text("signature"),
  signatureName: text("signature_name"),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProtocolSchema = createInsertSchema(protocols);
export type Protocol = typeof protocols.$inferSelect;
export type InsertProtocol = typeof protocols.$inferInsert;

/* -------------------------------------------------------------------------
 *  Zod schemas / TypeScript types used throughout the project
 * ----------------------------------------------------------------------- */
// Error severity enum
export const ErrorSeverityEnum = z.enum(["critical", "medium", "low"]);
export type ErrorSeverity = z.infer<typeof ErrorSeverityEnum>;

// ProtocolError – stored inside the `errors` JSON column
export const ProtocolErrorSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  severity: ErrorSeverityEnum,
  images: z.array(z.string()).default([]),
});
export type ProtocolError = z.infer<typeof ProtocolErrorSchema>;

/* -------------------------------------------------------------------------
 *  Templates
 * ----------------------------------------------------------------------- */
export const templates = pgTable("templates", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  type: text("type").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  language: text("language")
    .notNull()
    .default("multilingual"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  isActive: boolean("is_active").notNull().default(false),
});

export const insertTemplateSchema = createInsertSchema(templates);
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;

/* -------------------------------------------------------------------------
 *  Question configurations – single source of truth for questions
 * ----------------------------------------------------------------------- */
// Optional enum for the `type` column (adjust to your domain)
export const QuestionTypeEnum = z.enum([
  "text",
  "number",
  "date",
  "select",
  "checkbox",
]);
export type QuestionType = "number" | "date" | "select" | "text" | "checkbox" | "radio" | "measurement" | "calculated" | "true_false" | "yes_no_na";

export const questionConfigs = pgTable("question_configs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  templateId: text("template_id")
    .notNull()
    .references(() => templates.id),
  questionId: text("question_id").notNull(),
  title: text("title").notNull(),
  titleHu: text("title_hu"),
  titleDe: text("title_de"),
  type: text("type").notNull(), // can be validated against QuestionTypeEnum in the Zod layer
  required: boolean("required").notNull().default(true),
  placeholder: text("placeholder"),
  cellReference: text("cell_reference"),
  sheetName: text("sheet_name").default("Sheet1"),
  multiCell: boolean("multi_cell").notNull().default(false),
  groupName: text("group_name"),
  groupNameDe: text("group_name_de"),
  groupOrder: integer("group_order").default(0),
  unit: text("unit"),
  minValue: integer("min_value"),
  maxValue: integer("max_value"),
  calculationFormula: text("calculation_formula"),
  calculationInputs: jsonb("calculation_inputs"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQuestionConfigSchema = createInsertSchema(
  questionConfigs,
);
export type QuestionConfig = typeof questionConfigs.$inferSelect;
export type InsertQuestionConfig = typeof questionConfigs.$inferInsert;

/* Export a generic “Question” type for code that expects this name */
export type Question = QuestionConfig;

/* -------------------------------------------------------------------------
 *  Relations – enables eager loading with Drizzle
 * ----------------------------------------------------------------------- */
export const templatesRelations = relations(templates, ({ many }) => ({
  questionConfigs: many(questionConfigs),
}));

export const questionConfigsRelations = relations(
  questionConfigs,
  ({ one }) => ({
    template: one(templates, {
      fields: [questionConfigs.templateId],
      references: [templates.id],
    }),
  }),
);