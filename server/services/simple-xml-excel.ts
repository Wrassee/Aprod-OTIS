// server/services/simple-xml-excel.ts
import JSZip from 'jszip';
import { storage } from '../storage.js';
import { templateLoader } from './template-loader.js';
import type { FormData } from '../../shared/types.js';

class SimpleXmlExcelService {
  async generateExcelFromTemplate(formData: FormData, language: string): Promise<Buffer> {
    try {
      console.log('XML: Loading protocol template...');
      const templateBuffer = await templateLoader.loadTemplateBuffer('protocol', language);
      console.log(`Using XML approach with loaded template (${templateBuffer.length} bytes)`);

      let questionsTemplate = await storage.getActiveTemplate('unified', 'multilingual') ?? await storage.getActiveTemplate('questions', language);
      
      let questionConfigs: any[] = [];
      if (questionsTemplate) {
        questionConfigs = await storage.getQuestionConfigsByTemplate(questionsTemplate.id);
        console.log(`Loaded ${questionConfigs.length} question configs.`);
      } else {
        console.warn('No active question template found!');
      }

      return await this.replaceInXmlArchive(templateBuffer, formData, questionConfigs, language);
    } catch (error) {
      console.error('XML Excel service error:', error);
      throw error;
    }
  }
  
  // --- JAVÍTÁS: VISSZAÁLLÍTVA AZ EREDETI, BIZTONSÁGOS XML-KEZELŐ FÜGGVÉNY ---
  private async replaceInXmlArchive(
    templateBuffer: Buffer, 
    formData: FormData, 
    questionConfigs: any[], 
    language: string
  ): Promise<Buffer> {
    try {
      const zip = await JSZip.loadAsync(templateBuffer);
      const cellMappings = this.createCellMappings(formData, questionConfigs, language);
      console.log(`Created ${cellMappings.length} XML cell mappings.`);
      
      const sheetFile = Object.keys(zip.files).find(name => name.startsWith('xl/worksheets/') && name.endsWith('.xml'));
      if (!sheetFile) throw new Error('No worksheet files found in Excel template');

      let worksheetXml = await zip.file(sheetFile)!.async('text');
      let modifiedCount = 0;

      cellMappings.forEach(mapping => {
        const { cell, value } = mapping;
        const escapedValue = this.escapeXml(value);
        
        const cellPattern = new RegExp(`(<c r="${cell}"[^>]*>)([^<]*)(</c>)`);

        // Eredeti, biztonságos logika visszaállítva
        if (cellPattern.test(worksheetXml)) {
          worksheetXml = worksheetXml.replace(cellPattern, `$1<is><t>${escapedValue}</t></is>$3`);
          modifiedCount++;
          console.log(`XML: Replaced content in cell ${cell}`);
        } else if (worksheetXml.includes(`<c r="${cell}" s="`)) {
          const styleMatch = worksheetXml.match(new RegExp(`<c r="${cell}" s="([^"]+)"/>`));
          if (styleMatch) {
            const styleValue = styleMatch[1];
            const replacement = `<c r="${cell}" s="${styleValue}" t="inlineStr"><is><t>${escapedValue}</t></is></c>`;
            worksheetXml = worksheetXml.replace(new RegExp(`<c r="${cell}" s="${styleValue}"/>`), replacement);
            modifiedCount++;
            console.log(`XML: Set value for empty styled cell ${cell}`);
          }
        } else {
            console.warn(`XML: Could not find a pattern to replace for cell ${cell}.`);
        }
      });

      console.log(`XML: Modified ${modifiedCount} cells in total.`);
      zip.file(sheetFile, worksheetXml);

      return await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    } catch (error) {
      console.error('Error during XML replacement:', error);
      throw error;
    }
  }

  private createCellMappings(formData: FormData, questionConfigs: any[], language: string): Array<{cell: string, value: string, label: string}> {
    const mappings: Array<{cell: string, value: string, label: string}> = [];
    
    Object.entries(formData.answers).forEach(([questionId, answer]) => {
      const config = questionConfigs.find(q => String(q.questionId) === questionId);

      if (!config) {
        return;
      }
      
      if (config.cellReference && answer !== null && answer !== undefined && answer !== '') {
        
        // --- HELYES LOGIKA: A rádiógombok (yes/no/na) kezelése ---
        if (config.type === 'yes_no_na' || config.type === 'radio') {
          console.log(`Processing radio question "${questionId}" with answer: "${answer}"`);
          const cellRefs = config.cellReference.split(',').map((c: string) => c.trim());
          const [yesCells, noCells, naCells] = cellRefs;

          const applyX = (cells: string) => {
            if (!cells) return;
            cells.split(';').map(c => c.trim()).filter(Boolean).forEach(cell => {
              mappings.push({ cell, value: 'x', label: `Question ${questionId}` });
            });
          };

          if (answer === 'yes') applyX(yesCells);
          else if (answer === 'no') applyX(noCells);
          else if (answer === 'na') applyX(naCells);
        } 
        // --- HELYES LOGIKA: A checkboxok (true/false) kezelése ---
        else if (config.type === 'true_false' || config.type === 'checkbox') {
          const cellValue = (answer === 'true' || answer === true) ? 'X' : '-';
          console.log(`Processing checkbox question "${questionId}" -> ${cellValue}`);
          mappings.push({ cell: config.cellReference, value: cellValue, label: `Question ${questionId}` });
        } 
        // Minden más típusú kérdés
        else {
          mappings.push({ cell: config.cellReference, value: String(answer), label: `Question ${questionId}` });
        }
      }
    });
    
    // Hibák hozzáadása az Excelhez
    if (formData.errors && formData.errors.length > 0) {
      formData.errors.forEach((error, index) => {
        const row = 737 + index;
        mappings.push({ cell: `A${row}`, value: `${index + 1}`, label: `Error Number` });
        mappings.push({ cell: `D${row}`, value: error.description, label: `Error Description` });
        const severity = error.severity === 'critical' ? 'Kritikus' : error.severity === 'medium' ? 'Közepes' : 'Alacsony';
        mappings.push({ cell: `K${row}`, value: severity, label: `Error Severity` });
      });
    }
    
    return mappings;
  }

  private escapeXml(text: string): string {
    if (typeof text !== 'string') text = String(text);
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }
}

export const simpleXmlExcelService = new SimpleXmlExcelService();