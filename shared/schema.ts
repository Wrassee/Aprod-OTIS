import { relations } from "drizzle-orm";
// JAVÍTVA: A PostgreSQL-kompatibilis típusokat importáljuk
import { pgTable, text, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- Protocols ---
export const protocols = pgTable("protocols", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  receptionDate: text("reception_date").notNull(),
  language: text("language").notNull(),
  // JAVÍTVA: JSONB típust használunk a strukturált adatokhoz
  answers: jsonb("answers").notNull().default({}),
  errors: jsonb("errors").notNull().default([]),
  signature: text("signature"),
  signatureName: text("signature_name"),
  completed: boolean("completed").notNull().default(false),
  // JAVÍTVA: Helyes időbélyeg a PostgreSQL számára
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ErrorSeverity = z.enum(["critical", "medium", "low"]);
export const ProtocolError = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  severity: ErrorSeverity,
  images: z.array(z.string()).default([]),
});

export const insertProtocolSchema = createInsertSchema(protocols).omit({
  id: true,
  createdAt: true,
});

export type InsertProtocol = z.infer<typeof insertProtocolSchema>;
export type Protocol = typeof protocols.$inferSelect;


// --- Template Management ---
export const templates = pgTable("templates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  type: text("type").notNull(), // "questions" or "protocol"
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  language: text("language").notNull().default("multilingual"),
  // JAVÍTVA: Helyes időbélyeg a PostgreSQL számára
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  isActive: boolean("is_active").notNull().default(false),
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  uploadedAt: true,
});

export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templates.$inferSelect;


// --- Question Configurations ---
// Ez az egyetlen, "mindenható" definíció a kérdésekre.
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
  calculationInputs: jsonb("calculation_inputs"), // JAVÍTVA: JSONB a bemeneteknek
  // JAVÍTVA: Helyes időbélyeg a PostgreSQL számára
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQuestionConfigSchema = createInsertSchema(questionConfigs).omit({
  id: true,
  createdAt: true,
});

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