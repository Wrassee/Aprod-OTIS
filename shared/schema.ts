import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- Protocols ---
export const protocols = pgTable("protocols", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  receptionDate: text("reception_date").notNull(),
  language: text("language").notNull(),
  answers: jsonb("answers").notNull().default({}),
  errors: jsonb("errors").notNull().default([]),
  signature: text("signature"),
  signatureName: text("signature_name"),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Common Zod Schemas & Types ---
export const ErrorSeverity = z.enum(["critical", "medium", "low"]);
export type ErrorSeverity = z.infer<typeof ErrorSeverity>;

export const ProtocolError = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  severity: ErrorSeverity,
  images: z.array(z.string()).default([]),
});
// JAVÍTVA: Hiányzó típus export hozzáadva
export type ProtocolError = z.infer<typeof ProtocolError>;

export const insertProtocolSchema = createInsertSchema(protocols);
export type Protocol = typeof protocols.$inferSelect;
export type InsertProtocol = typeof protocols.$inferInsert;


// --- Template Management ---
export const templates = pgTable("templates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  type: text("type").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  language: text("language").notNull().default("multilingual"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  isActive: boolean("is_active").notNull().default(false),
});

export const insertTemplateSchema = createInsertSchema(templates);
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;


// --- Question Configurations (Single Source of Truth) ---
export const questionConfigs = pgTable("question_configs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  templateId: text("template_id").notNull().references(() => templates.id),
  questionId: text("question_id").notNull(),
  title: text("title").notNull(),
  titleHu: text("title_hu"),
  titleDe: text("title_de"),
  type: text("type").notNull(),
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

// JAVÍTVA: A QuestionType-ot a `type` oszlop alapján definiáljuk, ha szükséges
// Ha a 'type' oszlop csak bizonyos értékeket vehet fel, itt lehetne szűkíteni Zod-dal.
// Egyelőre string-ként kezeljük, ahogy a DB-ben van.

export const insertQuestionConfigSchema = createInsertSchema(questionConfigs);
export type QuestionConfig = typeof questionConfigs.$inferSelect;
export type InsertQuestionConfig = typeof questionConfigs.$inferInsert;


// --- Relations ---
export const templatesRelations = relations(templates, ({ many }) => ({
  questionConfigs: many(questionConfigs),
}));

export const questionConfigsRelations = relations(questionConfigs, ({ one }) => ({
  template: one(templates, {
    fields: [questionConfigs.templateId],
    references: [templates.id],
  }),
}));