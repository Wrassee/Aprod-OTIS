import { type Protocol, type InsertProtocol, type Template, type InsertTemplate, type QuestionConfig, type InsertQuestionConfig } from "../shared/schema.js";
import { randomUUID } from "crypto";
import { db } from './db.js';
import { eq, and, desc } from 'drizzle-orm';
import { protocols, templates, questionConfigs } from '../shared/schema.js'.js;

export interface IStorage {
  // Protocols
  getProtocol(id: string): Promise<Protocol | undefined>;
  createProtocol(protocol: InsertProtocol): Promise<Protocol>;
  updateProtocol(id: string, updates: Partial<Protocol>): Promise<Protocol | undefined>;
  getAllProtocols(): Promise<Protocol[]>;
  
  // Templates
  getTemplate(id: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: string, updates: Partial<Template>): Promise<Template | undefined>;
  getAllTemplates(): Promise<Template[]>;
  getActiveTemplate(type: string, language: string): Promise<Template | undefined>;
  setActiveTemplate(id: string): Promise<void>;
  deleteTemplate(id: string): Promise<boolean>;
  
  // Question Configurations
  getQuestionConfig(id: string): Promise<QuestionConfig | undefined>;
  createQuestionConfig(config: InsertQuestionConfig): Promise<QuestionConfig>;
  updateQuestionConfig(id: string, updates: Partial<QuestionConfig>): Promise<QuestionConfig | undefined>;
  deleteQuestionConfig(id: string): Promise<boolean>;
  getQuestionConfigsByTemplate(templateId: string): Promise<QuestionConfig[]>;
  deleteQuestionConfigsByTemplate(templateId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Protocol methods
  async getProtocol(id: string): Promise<Protocol | undefined> {
    const [protocol] = await db.select().from(protocols).where(eq(protocols.id, id));
    return protocol || undefined;
  }

  async createProtocol(insertProtocol: InsertProtocol): Promise<Protocol> {
    // JAVÍTVA: A Drizzle a Date objektumot helyesen kezeli
    const dataWithDate = { ...insertProtocol, createdAt: new Date() };
    const [protocol] = await db
      .insert(protocols)
      .values(dataWithDate)
      .returning();
    return protocol;
  }

  async updateProtocol(id: string, updates: Partial<Protocol>): Promise<Protocol | undefined> {
    const [updated] = await db
      .update(protocols)
      .set(updates)
      .where(eq(protocols.id, id))
      .returning();
    return updated || undefined;
  }

  async getAllProtocols(): Promise<Protocol[]> {
    return await db.select().from(protocols).orderBy(desc(protocols.createdAt));
  }

  // Template methods
  async getTemplate(id: string): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template || undefined;
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    // JAVÍTVA: A Drizzle a Date objektumot helyesen kezeli
    const dataWithDate = { ...insertTemplate, uploadedAt: new Date() };
    const [template] = await db
      .insert(templates)
      .values(dataWithDate)
      .returning();
    return template;
  }

  async updateTemplate(id: string, updates: Partial<Template>): Promise<Template | undefined> {
    const [updated] = await db
      .update(templates)
      .set(updates)
      .where(eq(templates.id, id))
      .returning();
    return updated || undefined;
  }

  async getAllTemplates(): Promise<Template[]> {
    return await db.select().from(templates).orderBy(desc(templates.uploadedAt));
  }

  async getActiveTemplate(type: string, language: string): Promise<Template | undefined> {
    console.log(`🔍 Looking for active template: type=${type}, language=${language}`);
    
    // First try exact language match
    let [template] = await db
      .select()
      .from(templates)
      .where(
        and(
          eq(templates.type, type),
          eq(templates.language, language),
          eq(templates.isActive, true)
        )
      );
    
    // If no exact match, try multilingual template
    if (!template) {
      console.log(`🔍 No ${language} template found, trying multilingual...`);
      [template] = await db
        .select()
        .from(templates)
        .where(
          and(
            eq(templates.type, type),
            eq(templates.language, 'multilingual'),
            eq(templates.isActive, true)
          )
        );
    }
    
    console.log(`📋 Found template:`, template ? `${template.name} (${template.language}, active: ${template.isActive})` : 'None');
    return template || undefined;
  }

  async setActiveTemplate(id: string): Promise<void> {
    const template = await this.getTemplate(id);
    if (!template) throw new Error('Template not found');

    console.log(`🔄 Activating template: ${template.name} (${template.type}, ${template.language})`);
    
    // First, deactivate ALL templates of the same type and language
    await db
      .update(templates)
      .set({ isActive: false })
      .where(
        and(
          eq(templates.type, template.type),
          eq(templates.language, template.language)
        )
      );
    
    // Then activate the specified template
    await db
      .update(templates)
      .set({ isActive: true })
      .where(eq(templates.id, id));
    
    console.log(`✅ Activated template: ${template.name}`);
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const result = await db
      .delete(templates)
      .where(eq(templates.id, id))
      .returning();
    return result.length > 0;
  }

  // Question Config methods
  async getQuestionConfig(id: string): Promise<QuestionConfig | undefined> {
    const [config] = await db.select().from(questionConfigs).where(eq(questionConfigs.id, id));
    return config || undefined;
  }

  async createQuestionConfig(insertConfig: InsertQuestionConfig): Promise<QuestionConfig> {
    // JAVÍTVA: A Drizzle a Date objektumot helyesen kezeli
    const dataWithDate = { ...insertConfig, createdAt: new Date() };
    const [config] = await db
      .insert(questionConfigs)
      .values(dataWithDate)
      .returning();
    return config;
  }

  async updateQuestionConfig(id: string, updates: Partial<QuestionConfig>): Promise<QuestionConfig | undefined> {
    const [updated] = await db
      .update(questionConfigs)
      .set(updates)
      .where(eq(questionConfigs.id, id))
      .returning();
    return updated || undefined;
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
}

export const storage = new DatabaseStorage();