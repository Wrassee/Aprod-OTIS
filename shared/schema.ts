import { sql } from "drizzle-orm";
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
});
export type Question = z.infer<typeof Question>;
