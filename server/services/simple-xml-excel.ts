import JSZip from 'jszip';
import * as fs from 'fs';
import { storage } from '../storage';
import type { FormData } from '../../client/src/lib/types';

class SimpleXmlExcelService {
  async generateExcelFromTemplate(formData: FormData, language: string): Promise<Buffer> {
    try {
      // Get the active protocol template
      const protocolTemplate = await storage.getActiveTemplate('protocol', language);
      
      if (!protocolTemplate) {
        throw new Error('No active protocol template found');
      }

      console.log(`Using XML approach for template: ${protocolTemplate.name}`);
      
      // Read template file
      const templateBuffer = fs.readFileSync(protocolTemplate.filePath);
      
      // Get question configs for cell mapping
      const questionsTemplate = await storage.getActiveTemplate('questions', language);
      let questionConfigs: any[] = [];
      
      if (questionsTemplate) {
        questionConfigs = await storage.getQuestionConfigsByTemplate(questionsTemplate.id);
        console.log('Loaded question configs for XML:', questionConfigs.length);
      }

      // Process with simple string replacement in XML
      return await this.replaceInXmlArchive(templateBuffer, formData, questionConfigs, language);
      
    } catch (error) {
      console.error('XML Excel service error:', error);
      throw error;
    }
  }

  private async replaceInXmlArchive(
    templateBuffer: Buffer, 
    formData: FormData, 
    questionConfigs: any[], 
    language: string
  ): Promise<Buffer> {
    try {
      // Load the Excel file as a ZIP archive
      const zip = await JSZip.loadAsync(templateBuffer);
      
      // Create value mappings
      const cellMappings = this.createCellMappings(formData, questionConfigs, language);
      console.log('XML mappings created:', cellMappings.length);
      
      // Find and modify worksheet files
      const worksheetFiles = Object.keys(zip.files).filter(name => 
        name.startsWith('xl/worksheets/') && name.endsWith('.xml')
      );
      
      if (worksheetFiles.length === 0) {
        throw new Error('No worksheet files found in Excel template');
      }

      // Process the first worksheet
      const sheetFile = worksheetFiles[0];
      console.log(`Processing XML worksheet: ${sheetFile}`);
      
      // Read the worksheet XML as text
      let worksheetXml = await zip.file(sheetFile)!.async('text');
      
      // Perform direct text replacements for cell values
      let modifiedCount = 0;
      cellMappings.forEach(mapping => {
        const { cell, value } = mapping;
        
        // Look for existing cell patterns and replace value
        const cellPattern = new RegExp(`(<c r="${cell}"[^>]*>)([^<]*)(</c>)`, 'g');
        const emptyPattern = new RegExp(`<c r="${cell}"[^>]*/>`, 'g');
        
        // Replace existing cell content
        if (cellPattern.test(worksheetXml)) {
          worksheetXml = worksheetXml.replace(cellPattern, `$1<is><t>${this.escapeXml(value)}</t></is>$3`);
          modifiedCount++;
          console.log(`XML: Replaced ${cell} = "${value}"`);
        } 
        // Replace self-closing empty cells
        else if (emptyPattern.test(worksheetXml)) {
          worksheetXml = worksheetXml.replace(emptyPattern, `<c r="${cell}" t="inlineStr"><is><t>${this.escapeXml(value)}</t></is></c>`);
          modifiedCount++;
          console.log(`XML: Added ${cell} = "${value}"`);
        }
        // Insert new cell if row exists
        else {
          const rowNumber = cell.match(/\\d+/)?.[0];
          if (rowNumber) {
            const rowPattern = new RegExp(`(<row r="${rowNumber}"[^>]*>)(.*?)(</row>)`, 'g');
            if (rowPattern.test(worksheetXml)) {
              worksheetXml = worksheetXml.replace(rowPattern, 
                `$1$2<c r="${cell}" t="inlineStr"><is><t>${this.escapeXml(value)}</t></is></c>$3`);
              modifiedCount++;
              console.log(`XML: Inserted ${cell} = "${value}"`);
            }
          }
        }
      });
      
      console.log(`XML: Modified ${modifiedCount} cells`);
      
      // Update the ZIP with modified worksheet
      zip.file(sheetFile, worksheetXml);
      
      // Generate the final Excel buffer
      const result = await zip.generateAsync({ 
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      console.log(`XML Excel generation successful with ${modifiedCount} modifications`);
      return result;
      
    } catch (error) {
      console.error('Error in XML string replacement:', error);
      throw error;
    }
  }

  private createCellMappings(formData: FormData, questionConfigs: any[], language: string) {
    const mappings: Array<{cell: string, value: string, label: string}> = [];
    
    // Add answers based on question configs
    Object.entries(formData.answers).forEach(([questionId, answer]) => {
      const config = questionConfigs.find(q => q.questionId === questionId);
      
      if (config && config.cellReference && answer !== '' && answer !== null && answer !== undefined) {
        mappings.push({
          cell: config.cellReference,
          value: this.formatAnswer(answer, language),
          label: config.title || `Question ${questionId}`
        });
      }
    });
    
    // Add signature name if available and not conflicts
    if (formData.signatureName && !mappings.find(m => m.cell === 'F9')) {
      mappings.push({
        cell: 'F9',
        value: formData.signatureName,
        label: 'Signature name'
      });
    }
    
    return mappings;
  }

  private formatAnswer(value: any, language: string): string {
    if (typeof value === 'boolean') {
      return language === 'hu' ? (value ? 'Igen' : 'Nem') : (value ? 'Yes' : 'No');
    }
    
    if (value === 'yes') {
      return language === 'hu' ? 'Igen' : 'Yes';
    }
    
    if (value === 'no') {
      return language === 'hu' ? 'Nem' : 'No';
    }
    
    if (value === 'na') {
      return language === 'hu' ? 'N/A' : 'N/A';
    }
    
    return String(value);
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export const simpleXmlExcelService = new SimpleXmlExcelService();