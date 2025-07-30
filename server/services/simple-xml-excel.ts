import JSZip from 'jszip';
import * as fs from 'fs';
import { storage } from '../storage';
import type { FormData } from '../../client/src/lib/types';

class SimpleXmlExcelService {
  async generateExcelFromTemplate(formData: FormData, language: string): Promise<Buffer> {
    try {
      // Get the active protocol template - try multilingual first, then language-specific
      let protocolTemplate = await storage.getActiveTemplate('protocol', 'multilingual');
      if (!protocolTemplate) {
        protocolTemplate = await storage.getActiveTemplate('protocol', language);
      }
      
      if (!protocolTemplate) {
        throw new Error('No active protocol template found');
      }

      console.log(`SIMPLE APPROACH: Using template: ${protocolTemplate.name}`);
      
      // Read template file
      const templateBuffer = fs.readFileSync(protocolTemplate.filePath);
      
      // Get question configs for cell mapping - try multilingual first, then unified, then language-specific
      let questionsTemplate = await storage.getActiveTemplate('questions', 'multilingual');
      if (!questionsTemplate) {
        questionsTemplate = await storage.getActiveTemplate('unified', 'multilingual');
      }
      if (!questionsTemplate) {
        questionsTemplate = await storage.getActiveTemplate('questions', language);
      }
      if (!questionsTemplate) {
        questionsTemplate = await storage.getActiveTemplate('unified', language);
      }
      
      console.log('Questions template search result:', questionsTemplate ? `Found: ${questionsTemplate.name} (${questionsTemplate.language})` : 'NOT FOUND');
      
      let questionConfigs: any[] = [];
      
      if (questionsTemplate) {
        questionConfigs = await storage.getQuestionConfigsByTemplate(questionsTemplate.id);
        console.log('Loaded question configs for SIMPLE approach:', questionConfigs.length);
        console.log('Question config IDs:', questionConfigs.map(q => q.questionId));
      } else {
        console.error('No questions template found! Cannot map data to Excel cells.');
      }

      // Process with very simple template copy - only basic text/number data
      return await this.copyTemplateWithBasicData(templateBuffer, formData, questionConfigs, language);
      
    } catch (error) {
      console.error('SIMPLE Excel service error:', error);
      throw error;
    }
  }

  private async copyTemplateWithBasicData(
    templateBuffer: Buffer, 
    formData: FormData, 
    questionConfigs: any[], 
    language: string
  ): Promise<Buffer> {
    try {
      console.log('SIMPLE COPY: Starting minimal template processing');
      
      // Create ONLY basic text/number mappings - no complex logic
      const basicMappings = this.createBasicTextMappings(formData, questionConfigs);
      console.log('Simple basic mappings created:', basicMappings.length);
      
      // If no basic mappings found, return original template unchanged
      if (basicMappings.length === 0) {
        console.log('No basic data to insert, returning unchanged template');
        return templateBuffer;
      }
      
      // Load Excel as ZIP
      const zip = await JSZip.loadAsync(templateBuffer);
      const worksheetFiles = Object.keys(zip.files).filter(name => 
        name.startsWith('xl/worksheets/') && name.endsWith('.xml')
      );
      
      if (worksheetFiles.length === 0) {
        console.log('No worksheet found, returning unchanged template');
        return templateBuffer;
      }

      // Simple replacement in first worksheet only
      const sheetFile = worksheetFiles[0];
      let worksheetXml = await zip.file(sheetFile)!.async('text');
      
      let modifiedCount = 0;
      basicMappings.forEach(mapping => {
        const { cell, value } = mapping;
        
        // Check if cell exists in worksheet
        const cellExists = worksheetXml.includes(`r="${cell}"`);
        console.log(`SIMPLE: Checking cell ${cell}, exists: ${cellExists}`);
        
        if (cellExists) {
          // Try multiple patterns to find and replace cell content
          
          // Pattern 1: Cell with existing <v> content
          let pattern1 = new RegExp(`(<c r="${cell}"[^>]*>)<v>[^<]*</v>(</c>)`);
          if (pattern1.test(worksheetXml)) {
            worksheetXml = worksheetXml.replace(pattern1, `$1<v>${this.escapeXml(value)}</v>$2`);
            modifiedCount++;
            console.log(`SIMPLE: Updated cell with <v> content: ${cell} = "${value}"`);
            return;
          }
          
          // Pattern 2: Self-closing empty cell
          let pattern2 = new RegExp(`<c r="${cell}"([^>]*)/>`);
          if (pattern2.test(worksheetXml)) {
            worksheetXml = worksheetXml.replace(pattern2, `<c r="${cell}"$1><v>${this.escapeXml(value)}</v></c>`);
            modifiedCount++;
            console.log(`SIMPLE: Updated self-closing cell: ${cell} = "${value}"`);
            return;
          }
          
          // Pattern 3: Cell with any content
          let pattern3 = new RegExp(`(<c r="${cell}"[^>]*>).*?(</c>)`);
          if (pattern3.test(worksheetXml)) {
            worksheetXml = worksheetXml.replace(pattern3, `$1<v>${this.escapeXml(value)}</v>$2`);
            modifiedCount++;
            console.log(`SIMPLE: Updated cell with any content: ${cell} = "${value}"`);
            return;
          }
          
          console.log(`SIMPLE: Could not update cell ${cell}, no matching pattern found`);
        } else {
          console.log(`SIMPLE: Cell ${cell} not found in worksheet`);
        }
      });

      // Save changes if any were made
      if (modifiedCount > 0) {
        zip.file(sheetFile, worksheetXml);
        
        const result = await zip.generateAsync({
          type: 'nodebuffer',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        });
        
        console.log(`SIMPLE: Modified ${modifiedCount} cells, generated ${result.length} bytes`);
        return result;
      } else {
        console.log('SIMPLE: No changes made, returning unchanged template');
        return templateBuffer;
      }
      
    } catch (error) {
      console.error('Error in simple copy:', error);
      // Always return original template on error to avoid corruption
      return templateBuffer;
    }
  }

  private createBasicTextMappings(formData: FormData, questionConfigs: any[]) {
    const mappings: Array<{cell: string, value: string, label: string}> = [];
    
    // Add ONLY basic text/number answers - skip all complex question types
    Object.entries(formData.answers).forEach(([questionId, answer]) => {
      const config = questionConfigs.find(q => q.questionId === questionId || q.questionId === String(questionId));
      
      if (config && config.cellReference && answer !== '' && answer !== null && answer !== undefined) {
        // Only process text and number question types
        if (config.type === 'text' || config.type === 'number') {
          mappings.push({
            cell: config.cellReference,
            value: String(answer),
            label: config.title || `Question ${questionId}`
          });
          console.log(`SIMPLE: Added basic ${config.type} mapping: ${questionId} -> ${config.cellReference} = "${answer}"`);
        } else {
          console.log(`SIMPLE: Skipping complex question type: ${config.type} (${questionId})`);
        }
      }
    });
    
    // Add signature name if available
    if (formData.signatureName) {
      mappings.push({
        cell: 'F9',
        value: formData.signatureName,
        label: 'Signature name'
      });
      console.log(`SIMPLE: Added signature name: F9 = "${formData.signatureName}"`);
    }
    
    return mappings;
  }

  private escapeXml(text: string): string {
    // Basic XML escaping for Hungarian characters
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export const simpleXmlExcelService = new SimpleXmlExcelService();