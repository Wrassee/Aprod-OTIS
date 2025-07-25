import { type Protocol, type InsertProtocol, type Template, type InsertTemplate, type QuestionConfig, type InsertQuestionConfig } from "@shared/schema";
import { randomUUID } from "crypto";

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
  
  // Question Configurations
  getQuestionConfig(id: string): Promise<QuestionConfig | undefined>;
  createQuestionConfig(config: InsertQuestionConfig): Promise<QuestionConfig>;
  updateQuestionConfig(id: string, updates: Partial<QuestionConfig>): Promise<QuestionConfig | undefined>;
  deleteQuestionConfig(id: string): Promise<boolean>;
  getQuestionConfigsByTemplate(templateId: string): Promise<QuestionConfig[]>;
}

export class MemStorage implements IStorage {
  private protocols: Map<string, Protocol>;
  private templates: Map<string, Template>;
  private questionConfigs: Map<string, QuestionConfig>;

  constructor() {
    this.protocols = new Map();
    this.templates = new Map();
    this.questionConfigs = new Map();
  }

  async getProtocol(id: string): Promise<Protocol | undefined> {
    return this.protocols.get(id);
  }

  async createProtocol(insertProtocol: InsertProtocol): Promise<Protocol> {
    const id = randomUUID();
    const protocol: Protocol = { 
      signature: insertProtocol.signature || null,
      signatureName: insertProtocol.signatureName || null,
      ...insertProtocol, 
      id,
      createdAt: new Date(),
    };
    this.protocols.set(id, protocol);
    return protocol;
  }

  async updateProtocol(id: string, updates: Partial<Protocol>): Promise<Protocol | undefined> {
    const existing = this.protocols.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.protocols.set(id, updated);
    return updated;
  }

  async getAllProtocols(): Promise<Protocol[]> {
    return Array.from(this.protocols.values());
  }

  // Template methods
  async getTemplate(id: string): Promise<Template | undefined> {
    return this.templates.get(id);
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const id = randomUUID();
    const template: Template = { 
      ...insertTemplate,
      id,
      uploadedAt: new Date(),
    };
    this.templates.set(id, template);
    return template;
  }

  async updateTemplate(id: string, updates: Partial<Template>): Promise<Template | undefined> {
    const existing = this.templates.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.templates.set(id, updated);
    return updated;
  }

  async getAllTemplates(): Promise<Template[]> {
    return Array.from(this.templates.values());
  }

  async getActiveTemplate(type: string, language: string): Promise<Template | undefined> {
    return Array.from(this.templates.values()).find(
      template => template.type === type && template.language === language && template.isActive
    );
  }

  async setActiveTemplate(id: string): Promise<void> {
    const template = this.templates.get(id);
    if (!template) throw new Error('Template not found');

    // Deactivate other templates of the same type and language
    Array.from(this.templates.values()).forEach(t => {
      if (t.type === template.type && t.language === template.language) {
        this.templates.set(t.id, { ...t, isActive: false });
      }
    });

    // Activate the specified template
    this.templates.set(id, { ...template, isActive: true });
  }

  // Question Config methods
  async getQuestionConfig(id: string): Promise<QuestionConfig | undefined> {
    return this.questionConfigs.get(id);
  }

  async createQuestionConfig(insertConfig: InsertQuestionConfig): Promise<QuestionConfig> {
    const id = randomUUID();
    const config: QuestionConfig = { 
      ...insertConfig,
      id,
      createdAt: new Date(),
    };
    this.questionConfigs.set(id, config);
    return config;
  }

  async updateQuestionConfig(id: string, updates: Partial<QuestionConfig>): Promise<QuestionConfig | undefined> {
    const existing = this.questionConfigs.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.questionConfigs.set(id, updated);
    return updated;
  }

  async deleteQuestionConfig(id: string): Promise<boolean> {
    return this.questionConfigs.delete(id);
  }

  async getQuestionConfigsByTemplate(templateId: string): Promise<QuestionConfig[]> {
    return Array.from(this.questionConfigs.values()).filter(
      config => config.templateId === templateId
    );
  }
}

export const storage = new MemStorage();
