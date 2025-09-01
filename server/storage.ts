// server/storage.ts
// ------------------------------------------------------------
// 1️⃣ Imports – all relative imports end with .js
// ------------------------------------------------------------
import {
  type Protocol,
  type InsertProtocol,
  type Template,
  type InsertTemplate,
  type QuestionConfig,
  type InsertQuestionConfig,
  protocols,
  templates,
  questionConfigs,
} from "../shared/schema.js";

import { db } from "./db.js";                     // Drizzle‑Postgres connection
import { eq, and, desc } from "drizzle-orm";    // Drizzle helpers

// ------------------------------------------------------------
// 2️⃣ IStorage interface – all public methods
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
// 3️⃣ DatabaseStorage – concrete implementation
// ------------------------------------------------------------
export class DatabaseStorage implements IStorage {
  /* ---------- Protocols ---------- */
  async getProtocol(id: string): Promise<Protocol | undefined> {
    const [protocol] = await db
      .select()
      .from(protocols)
      .where(eq(protocols.id, id));
    return protocol ?? undefined;
  }

  async createProtocol(protocol: InsertProtocol): Promise<Protocol> {
    const [created] = await db
      .insert(protocols)
      .values(protocol)
      .returning();
    return created;
  }

  async updateProtocol(id: string, updates: Partial<Protocol>): Promise<Protocol | undefined> {
    const [updated] = await db
      .update(protocols)
      .set(updates)
      .where(eq(protocols.id, id))
      .returning();
    return updated ?? undefined;
  }

  async getAllProtocols(): Promise<Protocol[]> {
    return await db
      .select()
      .from(protocols)
      .orderBy(desc(protocols.createdAt));
  }

  /* ---------- Templates ---------- */
  async getTemplate(id: string): Promise<Template | undefined> {
    const [tpl] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, id));
    return tpl ?? undefined;
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const [created] = await db
      .insert(templates)
      .values(template)
      .returning();
    return created;
  }

  async updateTemplate(id: string, updates: Partial<Template>): Promise<Template | undefined> {
    const [updated] = await db
      .update(templates)
      .set(updates)
      .where(eq(templates.id, id))
      .returning();
    return updated ?? undefined;
  }

  async getAllTemplates(): Promise<Template[]> {
    return await db
      .select()
      .from(templates)
      .orderBy(desc(templates.uploadedAt));
  }

  async getActiveTemplate(type: string, language: string): Promise<Template | undefined> {
    console.log(`🔍 Looking for active template – type=${type}, language=${language}`);

    // 1️⃣ Exact language match
    let [tpl] = await db
      .select()
      .from(templates)
      .where(
        and(
          eq(templates.type, type),
          eq(templates.language, language),
          eq(templates.isActive, true),
        ),
      );

    // 2️⃣ Fallback to multilingual if none found
    if (!tpl) {
      console.log(`🔍 No exact match – trying multilingual template`);
      [tpl] = await db
        .select()
        .from(templates)
        .where(
          and(
            eq(templates.type, type),
            eq(templates.language, "multilingual"),
            eq(templates.isActive, true),
          ),
        );
    }

    console.log(`📋 Result: ${tpl ? `${tpl.name} (${tpl.language})` : "none"}`);
    return tpl ?? undefined;
  }

  async setActiveTemplate(id: string): Promise<void> {
    const target = await this.getTemplate(id);
    if (!target) throw new Error("Template not found");

    // Use a transaction to keep the two updates atomic
    await db.transaction(async (tx) => {
      // Deactivate all templates of the same type & language
      await tx
        .update(templates)
        .set({ isActive: false })
        .where(
          and(
            eq(templates.type, target.type),
            eq(templates.language, target.language),
          ),
        );

      // Activate the chosen template
      await tx
        .update(templates)
        .set({ isActive: true })
        .where(eq(templates.id, id));
    });

    console.log(`✅ Activated template ${target.name}`);
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const result = await db
      .delete(templates)
      .where(eq(templates.id, id))
      .returning();
    return result.length > 0;
  }

  /* ---------- Question Configurations ---------- */
  async getQuestionConfig(id: string): Promise<QuestionConfig | undefined> {
    const [cfg] = await db
      .select()
      .from(questionConfigs)
      .where(eq(questionConfigs.id, id));
    return cfg ?? undefined;
  }

  async createQuestionConfig(config: InsertQuestionConfig): Promise<QuestionConfig> {
    const [created] = await db
      .insert(questionConfigs)
      .values(config)
      .returning();
    return created;
  }

  async updateQuestionConfig(id: string, updates: Partial<QuestionConfig>): Promise<QuestionConfig | undefined> {
    const [updated] = await db
      .update(questionConfigs)
      .set(updates)
      .where(eq(questionConfigs.id, id))
      .returning();
    return updated ?? undefined;
  }

  async deleteQuestionConfig(id: string): Promise<boolean> {
    const result = await db
      .delete(questionConfigs)
      .where(eq(questionConfigs.id, id))
      .returning();
    return result.length > 0;
  }

  async getQuestionConfigsByTemplate(templateId: string): Promise<QuestionConfig[]> {
    return await db
      .select()
      .from(questionConfigs)
      .where(eq(questionConfigs.templateId, templateId))
      .orderBy(questionConfigs.createdAt);
  }

  async deleteQuestionConfigsByTemplate(templateId: string): Promise<boolean> {
    const result = await db
      .delete(questionConfigs)
      .where(eq(questionConfigs.templateId, templateId))
      .returning();
    return result.length > 0;
  }

  /* ---------- Supplementary method ---------- */
  async getQuestions(lang: string): Promise<QuestionConfig[]> {
    // If the table contains a `language` column we filter on it,
    // otherwise we return all rows.
    // The existence check is done at runtime to stay schema‑agnostic.
    const hasLanguageColumn = "language" in questionConfigs;
    if (hasLanguageColumn) {
      return await db
        .select()
        .from(questionConfigs)
        .where(eq((questionConfigs as any).language, lang));
    }
    return await db.select().from(questionConfigs);
  }
}

// ------------------------------------------------------------
// 4️⃣ Exported singleton for convenient imports elsewhere
// ------------------------------------------------------------
export const storage = new DatabaseStorage();