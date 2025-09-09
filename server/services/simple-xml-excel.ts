// server/services/simple-xml-excel.ts
import JSZip from 'jszip';
import * as fs from 'fs';
import { storage } from '../storage.js';
import { templateLoader } from './template-loader.js';
import type { FormData } from '../../shared/types.js';

class SimpleXmlExcelService {
  async generateExcelFromTemplate(formData: FormData, language: string): Promise<Buffer> {
    try {
      console.log('XML: Loading protocol template via Supabase Storage...');
      
      const templateBuffer = await templateLoader.loadTemplateBuffer('protocol', language);
      console.log(`Using XML approach with loaded template (${templateBuffer.length} bytes)`);
      
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
        console.log('Loaded question configs for XML:', questionConfigs.length);
      }

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
      const zip = await JSZip.loadAsync(templateBuffer);
      
      const cellMappings = this.createCellMappings(formData, questionConfigs, language);
      console.log('XML mappings created:', cellMappings.length);
      
      const worksheetFiles = Object.keys(zip.files).filter(name => 
        name.startsWith('xl/worksheets/') && name.endsWith('.xml')
      );
      
      if (worksheetFiles.length === 0) {
        throw new Error('No worksheet files found in Excel template');
      }

      const sheetFile = worksheetFiles[0];
      console.log(`Processing XML worksheet: ${sheetFile}`);
      
      let worksheetXml = await zip.file(sheetFile)!.async('text');
      
      let modifiedCount = 0;
      cellMappings.forEach(mapping => {
        const { cell, value } = mapping;
        
        const cellPattern = new RegExp(`(<c r="${cell}"[^>]*>)([^<]*)(</c>)`, 'g');
        const emptyPattern = new RegExp(`<c r="${cell}"([^>]*?)/>`, 'g');
        
        if (cellPattern.test(worksheetXml)) {
          worksheetXml = worksheetXml.replace(cellPattern, `$1<is><t>${this.escapeXml(value)}</t></is>$3`);
          modifiedCount++;
        } 
        else if (worksheetXml.includes(`<c r="${cell}" s="`)) {
          const styleMatch = worksheetXml.match(new RegExp(`<c r="${cell}" s="([^"]+)"/>`));
          if (styleMatch) {
            const styleValue = styleMatch[1];
            const replacement = `<c r="${cell}" s="${styleValue}" t="inlineStr"><is><t>${this.escapeXml(value)}</t></is></c>`;
            worksheetXml = worksheetXml.replace(new RegExp(`<c r="${cell}" s="${styleValue}"/>`), replacement);
            modifiedCount++;
          }
        }
        else if (emptyPattern.test(worksheetXml)) {
          const rowNum = cell.match(/\d+/)?.[0];
          const defaultStyle = this.inferCellStyle(cell, rowNum);
          worksheetXml = worksheetXml.replace(emptyPattern, `<c r="${cell}"$1${defaultStyle} t="inlineStr"><is><t>${this.escapeXml(value)}</t></is></c>`);
          modifiedCount++;
        }
      });
      
      console.log(`XML: Modified ${modifiedCount} cells`);
      zip.file(sheetFile, worksheetXml);
      
      const result = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
      
      console.log(`XML Excel generation successful with ${modifiedCount} modifications`);
      return result;
      
    } catch (error) {
      console.error('Error in XML string replacement:', error);
      throw error;
    }
  }

  private createCellMappings(formData: FormData, questionConfigs: any[], language: string) {
    const mappings: Array<{cell: string, value: string, label: string}> = [];
    
    Object.entries(formData.answers).forEach(([questionId, answer]) => {
      const config = questionConfigs.find(q => q.questionId === questionId);
      
      if (config && config.cellReference && answer !== '' && answer !== null && answer !== undefined) {
        
        // --- HELYES LOGIKA: A rádiógombok (yes/no/na) kezelése ---
        if (config.type === 'yes_no_na' || config.type === 'radio') {
          console.log(`Processing radio question ${questionId}: ${answer}`);
          const cellRefs = config.cellReference.split(',').map((cell: string) => cell.trim());
          const [yesCells, noCells, naCells] = cellRefs;

          const applyX = (cells: string) => {
            if (!cells) return;
            cells.split(';').map(c => c.trim()).filter(Boolean).forEach(cell => {
              mappings.push({ cell, value: 'x', label: `${config.title} (${answer})` });
            });
          };

          if (answer === 'yes') applyX(yesCells);
          else if (answer === 'no') applyX(noCells);
          else if (answer === 'na') applyX(naCells);
        } 
        // --- HELYES LOGIKA: A checkboxok (true/false) kezelése ---
        else if (config.type === 'true_false' || config.type === 'checkbox') {
          const cellValue = (answer === 'true' || answer === true) ? 'X' : '-';
          console.log(`Processing checkbox question ${questionId}: ${answer} -> ${cellValue}`);
          mappings.push({
            cell: config.cellReference,
            value: cellValue,
            label: config.title || `Question ${questionId}`
          });
        } 
        else { // Minden más típusú kérdés
          mappings.push({
            cell: config.cellReference,
            value: String(answer), // Egyszerűsített formázás
            label: config.title || `Question ${questionId}`
          });
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

  private inferCellStyle(cell: string, rowNumber: string | undefined): string {
    const cellStyleMap: Record<string, string> = {
      'F9': ' s="576"', 'Q9': ' s="577"', 'G13': ' s="578"', 'Q13': ' s="579"',
      'G14': ' s="580"', 'N14': ' s="581"', 'O16': ' s="582"', 'Q25': ' s="583"',
      'A68': ' s="584"'
    };
    return cellStyleMap[cell] || ' s="576"';
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