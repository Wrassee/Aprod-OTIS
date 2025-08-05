import { type Protocol, type InsertProtocol, type Template, type InsertTemplate, type QuestionConfig, type InsertQuestionConfig } from "@shared/schema";
import { randomUUID } from "crypto";
import { localStorage } from './services/local-storage-service';
import { localFileService } from './services/local-file-service';

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

export class LocalStorage implements IStorage {
  // Protocol methods
  async getProtocol(id: string): Promise<Protocol | undefined> {
    return await localStorage.getProtocol(id);
  }

  async createProtocol(insertProtocol: InsertProtocol): Promise<Protocol> {
    const id = await localStorage.saveProtocol({
      answers: insertProtocol.answers || {},
      errors: insertProtocol.errors || [],
      signatureData: insertProtocol.signatureData,
      signatureName: insertProtocol.signatureName,
      receptionDate: insertProtocol.receptionDate || new Date().toISOString(),
      language: insertProtocol.language || 'hu'
    });
    
    const savedProtocol = await localStorage.getProtocol(id);
    if (!savedProtocol) {
      throw new Error('Failed to create protocol');
    }
    
    return savedProtocol;
  }

  async updateProtocol(id: string, updates: Partial<Protocol>): Promise<Protocol | undefined> {
    // Get existing protocol
    const existing = await localStorage.getProtocol(id);
    if (!existing) return undefined;
    
    // Create updated protocol data
    const updatedData = {
      answers: updates.answers || existing.answers,
      errors: updates.errors || existing.errors,
      signatureData: updates.signatureData !== undefined ? updates.signatureData : existing.signatureData,
      signatureName: updates.signatureName !== undefined ? updates.signatureName : existing.signatureName,
      receptionDate: updates.receptionDate || existing.receptionDate,
      language: updates.language || existing.language
    };
    
    // Save updated protocol (this will overwrite)
    await localStorage.saveProtocol(updatedData);
    
    return await localStorage.getProtocol(id);
  }

  async getAllProtocols(): Promise<Protocol[]> {
    return await localStorage.getAllProtocols();
  }

  // Template methods
  async getTemplate(id: string): Promise<Template | undefined> {
    const templates = await localStorage.getAllTemplates();
    return templates.find(t => t.id === id);
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const id = await localStorage.saveTemplate({
      name: insertTemplate.name,
      type: insertTemplate.type,
      language: insertTemplate.language,
      fileName: insertTemplate.fileName,
      filePath: insertTemplate.filePath,
      isActive: insertTemplate.isActive || false
    });
    
    const savedTemplate = await this.getTemplate(id);
    if (!savedTemplate) {
      throw new Error('Failed to create template');
    }
    
    return savedTemplate;
  }

  async updateTemplate(id: string, updates: Partial<Template>): Promise<Template | undefined> {
    // For simplicity, templates are read-only after creation in local storage
    // Only isActive can be updated through setActiveTemplate
    return this.getTemplate(id);
  }

  async getAllTemplates(): Promise<Template[]> {
    return await localStorage.getAllTemplates();
  }

  async getActiveTemplate(type: string, language: string): Promise<Template | undefined> {
    return await localStorage.getActiveTemplate(type, language);
  }

  async setActiveTemplate(id: string): Promise<void> {
    await localStorage.setTemplateActive(id, true);
    
    // Deactivate other templates of the same type and language
    const template = await this.getTemplate(id);
    if (template) {
      const allTemplates = await localStorage.getAllTemplates();
      const sameTypeTemplates = allTemplates.filter(
        t => t.type === template.type && t.language === template.language && t.id !== id
      );
      
      for (const t of sameTypeTemplates) {
        await localStorage.setTemplateActive(t.id, false);
      }
    }
  }

  async deleteTemplate(id: string): Promise<boolean> {
    try {
      await localStorage.deleteTemplate(id);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Question Config methods
  async getQuestionConfig(id: string): Promise<QuestionConfig | undefined> {
    // Question configs are stored per template, need to search through all templates
    const allTemplates = await localStorage.getAllTemplates();
    for (const template of allTemplates) {
      const configs = await localStorage.getQuestionConfigsByTemplate(template.id);
      const config = configs.find(c => c.id === id);
      if (config) return config;
    }
    return undefined;
  }

  async createQuestionConfig(insertConfig: InsertQuestionConfig): Promise<QuestionConfig> {
    const id = await localStorage.saveQuestionConfig({
      templateId: insertConfig.templateId,
      questionId: insertConfig.questionId,
      cellReference: insertConfig.cellReference,
      type: insertConfig.type
    });
    
    const savedConfig = await this.getQuestionConfig(id);
    if (!savedConfig) {
      throw new Error('Failed to create question config');
    }
    
    return savedConfig;
  }

  async updateQuestionConfig(id: string, updates: Partial<QuestionConfig>): Promise<QuestionConfig | undefined> {
    // For simplicity, question configs are read-only after creation in local storage
    return this.getQuestionConfig(id);
  }

  async deleteQuestionConfig(id: string): Promise<boolean> {
    // Local storage doesn't support individual question config deletion
    // This would need to be implemented if required
    return false;
  }

  async getQuestionConfigsByTemplate(templateId: string): Promise<QuestionConfig[]> {
    return await localStorage.getQuestionConfigsByTemplate(templateId);
  }

  async deleteQuestionConfigsByTemplate(templateId: string): Promise<boolean> {
    // Local storage doesn't support bulk deletion
    // This would need to be implemented if required
    return false;
  }
}

export const storage = new LocalStorage();
