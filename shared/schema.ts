import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, boolean, integer } from "drizzle-orm/pg-core";
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
export const QuestionType = z.enum(["yes_no_na", "number", "text", "true_false", "measurement", "calculated"]);
export type QuestionType = z.infer<typeof QuestionType>;

export const AnswerValue = z.union([
  z.enum(["yes", "no", "na"]),
  z.enum(["true", "false"]),
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

export const QuestionSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: QuestionType,
  required: z.boolean().default(true),
  placeholder: z.string().optional(),
  cellReference: z.string().optional(), // Excel cell reference like "B5" or "A5;B5" for true_false pairs
  sheetName: z.string().optional(), // Sheet name in Excel file
  groupSize: z.number().optional(), // For true_false type: how many questions in this group
});
export type Question = z.infer<typeof QuestionSchema>;

// Template management
export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // "questions" or "protocol"
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  language: text("language").notNull().default("multilingual"), // "hu", "de", or "multilingual"
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
  cellReference: text("cell_reference"), // B5, C10, etc. For yes_no_na: comma-separated A5,B5,C5 or multi-row A5;A6;A7,B5;B6;B7,C5;C6;C7
  sheetName: text("sheet_name").default("Sheet1"),
  multiCell: boolean("multi_cell").notNull().default(false), // Controls multi-row X placement for yes_no_na
  groupName: text("group_name"), // Block group name for organizing questions (e.g., "Alapadatok", "Gépház", "Ajtók")
  groupNameDe: text("group_name_de"), // German group name (e.g., "Grunddaten", "Maschinenraum", "Türen")
  groupOrder: integer("group_order").default(0), // Order within the group
  // Measurement-specific fields
  unit: text("unit"), // mm, cm, m, etc.
  minValue: integer("min_value"), // Minimum allowed value
  maxValue: integer("max_value"), // Maximum allowed value
  calculationFormula: text("calculation_formula"), // e.g., "q1 + q2 - q3" for calculated fields
  calculationInputs: text("calculation_inputs"), // comma-separated question IDs used in calculation
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

// Measurement calculation interface
export interface MeasurementCalculation {
  id: string;
  name: string;
  nameHu?: string;
  nameDe?: string;
  formula: string; // e.g., "input1 + input2 - input3"
  inputIds: string[]; // References to measurement input IDs
  minValue?: number;
  maxValue?: number;
  targetCellReference?: string;
  sheetName?: string;
  unit: string; // mm, cm, m, etc.
}

// Question interface for frontend use  
export interface QuestionInterface {
  id: string;
  title: string;
  titleHu?: string;
  titleDe?: string;
  type: QuestionType;
  required?: boolean;
  placeholder?: string;
  cellReference?: string;
  sheetName?: string;
  groupName?: string;
  groupOrder?: number;
  // Measurement-specific properties
  unit?: string;
  minValue?: number;
  maxValue?: number;
  calculationFormula?: string;
  calculationInputs?: string;
}

// Niedervolt Measurements for Excel integration
export interface MeasurementRow {
  id: string;
  measurementType: string;
  description: string;
  value1: string;
  value2: string;
  value3: string;
  unit: string;
  notes: string;
}
