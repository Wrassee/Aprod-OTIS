import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const protocols = pgTable("protocols", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  receptionDate: text("reception_date").notNull(),
  language: text("language").notNull(),
  answers: jsonb("answers").notNull().default({}),
  errors: jsonb("errors").notNull().default([]),
  signature: text("signature"),
  signatureName: text("signature_name"),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertProtocolSchema = createInsertSchema(protocols).omit({
  id: true,
  createdAt: true,
});

export type InsertProtocol = z.infer<typeof insertProtocolSchema>;
export type Protocol = typeof protocols.$inferSelect;

// Question types
export const QuestionType = z.enum(["yes_no_na", "number", "text"]);
export type QuestionType = z.infer<typeof QuestionType>;

export const AnswerValue = z.union([
  z.enum(["yes", "no", "na"]),
  z.number(),
  z.string(),
]);
export type AnswerValue = z.infer<typeof AnswerValue>;

export const ErrorSeverity = z.enum(["critical", "medium", "low"]);
export type ErrorSeverity = z.infer<typeof ErrorSeverity>;

export const ProtocolError = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  severity: ErrorSeverity,
  images: z.array(z.string()).default([]),
});
export type ProtocolError = z.infer<typeof ProtocolError>;

export const Question = z.object({
  id: z.string(),
  title: z.string(),
  type: QuestionType,
  required: z.boolean().default(true),
  placeholder: z.string().optional(),
  cellReference: z.string().optional(), // Excel cell reference like "B5"
  sheetName: z.string().optional(), // Sheet name in Excel file
});
export type Question = z.infer<typeof Question>;

// Template management
export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // "questions" or "protocol"
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  language: text("language").notNull(),
  uploadedAt: timestamp("uploaded_at").notNull().default(sql`now()`),
  isActive: boolean("is_active").notNull().default(false),
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  uploadedAt: true,
});

export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templates.$inferSelect;

// Question configuration from Excel
export const questionConfigs = pgTable("question_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => templates.id),
  questionId: text("question_id").notNull(),
  title: text("title").notNull(),
  titleHu: text("title_hu"),
  titleDe: text("title_de"),
  type: text("type").notNull(),
  required: boolean("required").notNull().default(true),
  placeholder: text("placeholder"),
  cellReference: text("cell_reference"), // B5, C10, etc. (for text/number) or base cell for yes_no_na
  cellReferenceYes: text("cell_reference_yes"), // For yes_no_na: "yes" answer cell (B column)
  cellReferenceNo: text("cell_reference_no"), // For yes_no_na: "no" answer cell (C column)  
  cellReferenceNa: text("cell_reference_na"), // For yes_no_na: "na" answer cell (D column)
  sheetName: text("sheet_name").default("Sheet1"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertQuestionConfigSchema = createInsertSchema(questionConfigs).omit({
  id: true,
  createdAt: true,
});

export type InsertQuestionConfig = z.infer<typeof insertQuestionConfigSchema>;
export type QuestionConfig = typeof questionConfigs.$inferSelect;

// Relations
export const templatesRelations = relations(templates, ({ many }) => ({
  questionConfigs: many(questionConfigs),
}));

export const questionConfigsRelations = relations(questionConfigs, ({ one }) => ({
  template: one(templates, {
    fields: [questionConfigs.templateId],
    references: [templates.id],
  }),
}));
