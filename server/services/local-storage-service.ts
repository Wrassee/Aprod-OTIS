import { sqlite } from '../local-db';
import { ProtocolError } from '@shared/schema';
import { localFileService } from './local-file-service';

interface Template {
  id: string;
  name: string;
  type: string;
  language: string;
  fileName: string;
  filePath: string;
  isActive: boolean;
  uploadedAt: string;
}

interface Protocol {
  id: string;
  answers: Record<string, any>;
  errors: ProtocolError[];
  signatureData?: string;
  signatureName?: string;
  receptionDate: string;
  language: string;
  createdAt: string;
}

interface QuestionConfig {
  id: string;
  templateId: string;
  questionId: string;
  questionText: string;
  questionType: string;
  cellReference: string;
  language: string;
}

export class LocalStorageService {
  // Template operations
  async saveTemplate(template: Omit<Template, 'id' | 'uploadedAt'>): Promise<string> {
    const id = `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const uploadedAt = new Date().toISOString();

    const stmt = sqlite.prepare(`
      INSERT INTO templates (id, name, type, language, file_name, file_path, is_active, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, template.name, template.type, template.language, template.fileName, template.filePath, template.isActive ? 1 : 0, uploadedAt);

    console.log(`Template saved to local database: ${id}`);
    return id;
  }

  async getActiveTemplate(type: string, language: string): Promise<Template | null> {
    const stmt = sqlite.prepare(`
      SELECT * FROM templates 
      WHERE type = ? AND language = ? AND is_active = 1
      ORDER BY uploaded_at DESC 
      LIMIT 1
    `);

    const row = stmt.get(type, language) as any;
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      type: row.type,
      language: row.language,
      fileName: row.file_name,
      filePath: row.file_path,
      isActive: Boolean(row.is_active),
      uploadedAt: row.uploaded_at
    };
  }

  async getAllTemplates(): Promise<Template[]> {
    const stmt = sqlite.prepare('SELECT * FROM templates ORDER BY uploaded_at DESC');
    const rows = stmt.all() as any[];

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      language: row.language,
      fileName: row.file_name,
      filePath: row.file_path,
      isActive: Boolean(row.is_active),
      uploadedAt: row.uploaded_at
    }));
  }

  async setTemplateActive(id: string, isActive: boolean): Promise<void> {
    const stmt = sqlite.prepare('UPDATE templates SET is_active = ? WHERE id = ?');
    stmt.run(isActive ? 1 : 0, id); // Convert boolean to integer for SQLite
    console.log(`Template ${id} set to ${isActive ? 'active' : 'inactive'}`);
  }

  async deleteTemplate(id: string): Promise<void> {
    // Get template info before deleting
    const getStmt = sqlite.prepare('SELECT file_path FROM templates WHERE id = ?');
    const template = getStmt.get(id) as any;

    if (template) {
      // Delete file from filesystem
      await localFileService.deleteTemplate(template.file_path);
    }

    // Delete from database
    const deleteStmt = sqlite.prepare('DELETE FROM templates WHERE id = ?');
    deleteStmt.run(id);
    console.log(`Template deleted: ${id}`);
  }

  // Protocol operations
  async saveProtocol(protocol: Omit<Protocol, 'id' | 'createdAt'>): Promise<string> {
    const id = `prot_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const createdAt = new Date().toISOString();

    const stmt = sqlite.prepare(`
      INSERT INTO protocols (id, answers, errors, signature_data, signature_name, reception_date, language, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      JSON.stringify(protocol.answers),
      JSON.stringify(protocol.errors),
      protocol.signatureData || null,
      protocol.signatureName || null,
      protocol.receptionDate,
      protocol.language,
      createdAt
    );

    console.log(`Protocol saved to local database: ${id}`);
    return id;
  }

  async getProtocol(id: string): Promise<Protocol | null> {
    const stmt = sqlite.prepare('SELECT * FROM protocols WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return {
      id: row.id,
      answers: JSON.parse(row.answers || '{}'),
      errors: JSON.parse(row.errors || '[]'),
      signatureData: row.signature_data,
      signatureName: row.signature_name,
      receptionDate: row.reception_date,
      language: row.language,
      createdAt: row.created_at
    };
  }

  async getAllProtocols(): Promise<Protocol[]> {
    const stmt = sqlite.prepare('SELECT * FROM protocols ORDER BY created_at DESC');
    const rows = stmt.all() as any[];

    return rows.map(row => ({
      id: row.id,
      answers: JSON.parse(row.answers || '{}'),
      errors: JSON.parse(row.errors || '[]'),
      signatureData: row.signature_data,
      signatureName: row.signature_name,
      receptionDate: row.reception_date,
      language: row.language,
      createdAt: row.created_at
    }));
  }

  // Question config operations
  async saveQuestionConfig(config: Omit<QuestionConfig, 'id'>): Promise<string> {
    const id = `qc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const stmt = sqlite.prepare(`
      INSERT INTO question_configs (id, template_id, question_id, question_text, question_type, cell_reference, language, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, 
      config.templateId, 
      config.questionId, 
      config.questionText,
      config.questionType,
      config.cellReference, 
      config.language,
      new Date().toISOString()
    );

    console.log(`Question config saved: ${id} - ${config.questionText}`);
    return id;
  }

  async getQuestionConfig(id: string): Promise<QuestionConfig | undefined> {
    const stmt = sqlite.prepare('SELECT * FROM question_configs WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return undefined;

    return {
      id: row.id,
      templateId: row.template_id,
      questionId: row.question_id,
      questionText: row.question_text,
      questionType: row.question_type,
      cellReference: row.cell_reference,
      language: row.language
    };
  }

  async getQuestionConfigsByTemplate(templateId: string): Promise<QuestionConfig[]> {
    const stmt = sqlite.prepare('SELECT * FROM question_configs WHERE template_id = ?');
    const rows = stmt.all(templateId) as any[];

    return rows.map(row => ({
      id: row.id,
      templateId: row.template_id,
      questionId: row.question_id,
      questionText: row.question_text,
      questionType: row.question_type,
      cellReference: row.cell_reference,
      language: row.language
    }));
  }

  // Utility operations
  async cleanupOldProtocols(olderThanDays: number = 90): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const stmt = sqlite.prepare('DELETE FROM protocols WHERE created_at < ?');
    const result = stmt.run(cutoffDate.toISOString());
    
    console.log(`Cleaned up ${result.changes} old protocols`);
  }

  async getDatabaseStats(): Promise<any> {
    const templatesCount = sqlite.prepare('SELECT COUNT(*) as count FROM templates').get() as any;
    const protocolsCount = sqlite.prepare('SELECT COUNT(*) as count FROM protocols').get() as any;
    const configsCount = sqlite.prepare('SELECT COUNT(*) as count FROM question_configs').get() as any;

    return {
      templates: templatesCount.count,
      protocols: protocolsCount.count,
      questionConfigs: configsCount.count
    };
  }
}

// Export singleton instance
export const localStorage = new LocalStorageService();