// server/storage.ts
// ------------------------------------------------------------
// 1️⃣ Imports – keep the same schema objects that the db instance uses
// ------------------------------------------------------------
import {
  type Protocol,
  type InsertProtocol,
  type Template,
  type InsertTemplate,
  type QuestionConfig,
  type InsertQuestionConfig,
  // Re‑exported table definitions from the db module – this guarantees
  // the exact same type instances the DB was initialised with.
  protocols,
  templates,
  questionConfigs,
} from "./db.js"; // <-- <-- **IMPORTANT** – use the db module, not shared/schema

import { db } from "./db.js";                     // Drizzle‑Postgres connection
import { eq, and, desc } from "drizzle-orm";    // Drizzle helpers

// ------------------------------------------------------------
// 2️⃣ IStorage interface – unchanged
// ------------------------------------------------------------
export interface IStorage {
  /* ---------- Protocols ---------- */
  getProtocol(id: string): Promise<Protocol | undefined>;
  createProtocol(protocol: InsertProtocol): Promise<Protocol>;
  updateProtocol(id: string, updates: Partial<Protocol>): Promise<Protocol | undefined>;
  getAllProtocols(): Promise<Protocol[]>;

  /* ---------- Templates ---------- */
  getTemplate(id: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: string, updates: Partial<Template>): Promise<Template | undefined>;
  getAllTemplates(): Promise<Template[]>;
  getActiveTemplate(type: string, language: string): Promise<Template | undefined>;
  setActiveTemplate(id: string): Promise<void>;
  deleteTemplate(id: string): Promise<boolean>;

  /* ---------- Question Configurations ---------- */
  getQuestionConfig(id: string): Promise<QuestionConfig | undefined>;
  createQuestionConfig(config: InsertQuestionConfig): Promise<QuestionConfig>;
  updateQuestionConfig(id: string, updates: Partial<QuestionConfig>): Promise<QuestionConfig | undefined>;
  deleteQuestionConfig(id: string): Promise<boolean>;
  getQuestionConfigsByTemplate(templateId: string): Promise<QuestionConfig[]>;
  deleteQuestionConfigsByTemplate(templateId: string): Promise<boolean>;

  /* ---------- Supplementary method ---------- */
  /** Retrieves question definitions; if a `language` column exists it is filtered. */
  getQuestions(lang: string): Promise<QuestionConfig[]>;
}

// ------------------------------------------------------------
// 3️⃣ DatabaseStorage – concrete implementation (type‑safe)
// ------------------------------------------------------------
export class DatabaseStorage implements IStorage {
  /* ---------- Protocols ---------- */
  async getProtocol(id: string) {
    const [protocol] = await db.select().from(protocols).where(eq(protocols.id, id));
    return protocol ?? undefined;
  }

  async createProtocol(protocol: InsertProtocol) {
    const [created] = await db.insert(protocols).values(protocol).returning();
    return created;
  }

  async updateProtocol(id: string, updates: Partial<Protocol>) {
    const [updated] = await db
      .update(protocols)
      .set(updates)
      .where(eq(protocols.id, id))
      .returning();
    return updated ?? undefined;
  }

  async getAllProtocols() {
    return await db.select().from(protocols).orderBy(desc(protocols.createdAt));
  }

  /* ---------- Templates ---------- */
  async getTemplate(id: string) {
    const [tpl] = await db.select().from(templates).where(eq(templates.id, id));
    return tpl ?? undefined;
  }

  async createTemplate(template: InsertTemplate) {
    const [created] = await db.insert(templates).values(template).returning();
    return created;
  }

  async updateTemplate(id: string, updates: Partial<Template>) {
    const [updated] = await db
      .update(templates)
      .set(updates)
      .where(eq(templates.id, id))
      .returning();
    return updated ?? undefined;
  }

  async getAllTemplates() {
    return await db.select().from(templates).orderBy(desc(templates.uploadedAt));
  }

  async getActiveTemplate(type: string, language: string) {
    console.log(`🔍 Looking for active template – type=${type}, language=${language}`);

    // 1️⃣ Exact language match
    let [tpl] = await db
      .select()
      .from(templates)
      .where(and(eq(templates.type, type), eq(templates.language, language), eq(templates.isActive, true)));

    // 2️⃣ Fallback to multilingual
    if (!tpl) {
      console.log(`🔍 No exact match – trying multilingual`);
      [tpl] = await db
        .select()
        .from(templates)
        .where(and(eq(templates.type, type), eq(templates.language, "multilingual"), eq(templates.isActive, true)));
    }

    console.log(`📋 Result: ${tpl ? `${tpl.name} (${tpl.language})` : "none"}`);
    return tpl ?? undefined;
  }

  async setActiveTemplate(id: string) {
    const target = await this.getTemplate(id);
    if (!target) throw new Error("Template not found");

    // Use a transaction to keep the two updates atomic
    await db.transaction(async (tx) => {
      await tx
        .update(templates)
        .set({ isActive: false })
        .where(and(eq(templates.type, target.type), eq(templates.language, target.language)));

      await tx.update(templates).set({ isActive: true }).where(eq(templates.id, id));
    });

    console.log(`✅ Activated template ${target.name}`);
  }

  async deleteTemplate(id: string) {
    const result = await db.delete(templates).where(eq(templates.id, id)).returning();
    return result.length > 0;
  }

  /* ---------- Question Configurations ---------- */
  async getQuestionConfig(id: string) {
    const [cfg] = await db.select().from(questionConfigs).where(eq(questionConfigs.id, id));
    return cfg ?? undefined;
  }

  async createQuestionConfig(config: InsertQuestionConfig) {
    const [created] = await db.insert(questionConfigs).values(config).returning();
    return created;
  }

  async updateQuestionConfig(id: string, updates: Partial<QuestionConfig>) {
    const [updated] = await db
      .update(questionConfigs)
      .set(updates)
      .where(eq(questionConfigs.id, id))
      .returning();
    return updated ?? undefined;
  }

  async deleteQuestionConfig(id: string) {
    const result = await db.delete(questionConfigs).where(eq(questionConfigs.id, id)).returning();
    return result.length > 0;
  }

  async getQuestionConfigsByTemplate(templateId: string) {
    return await db
      .select()
      .from(questionConfigs)
      .where(eq(questionConfigs.templateId, templateId))
      .orderBy(questionConfigs.createdAt);
  }

  async deleteQuestionConfigsByTemplate(templateId: string) {
    const result = await db
      .delete(questionConfigs)
      .where(eq(questionConfigs.templateId, templateId))
      .returning();
    return result.length > 0;
  }

  /* ---------- Supplementary method ---------- */
  async getQuestions(lang: string) {
    // If the underlying table has a `language` column we filter on it.
    // We check the property existence at runtime – this keeps the compile‑time
    // type safe while still being schema‑agnostic.
    const hasLanguageColumn = "language" in questionConfigs;
    if (hasLanguageColumn) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await db
        .select()
        .from(questionConfigs as any)
        .where(eq((questionConfigs as any).language, lang));
    }
    return await db.select().from(questionConfigs);
  }
}

// ------------------------------------------------------------
// 4️⃣ Exported singleton for convenient imports elsewhere
// ------------------------------------------------------------
export const storage = new DatabaseStorage();